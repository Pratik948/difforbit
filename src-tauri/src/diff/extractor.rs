use crate::models::review::DiffLine;

/// Extract `context` lines around `target_line` for `filename` from a unified diff.
pub fn extract_hunk_for_line(
    diff: &str,
    filename: &str,
    target_line: u32,
    context: u32,
) -> Vec<DiffLine> {
    let mut in_file = false;
    let mut new_line: u32 = 0;
    let mut all_lines: Vec<DiffLine> = Vec::new();

    for line in diff.lines() {
        if line.starts_with("+++ b/") {
            in_file = line[6..] == *filename;
            continue;
        }
        if !in_file { continue; }

        if line.starts_with("@@ ") {
            if let Some(start) = parse_new_start(line) {
                new_line = start;
            }
            all_lines.push(DiffLine { r#type: "hunk".to_string(), line: None, text: line.to_string() });
        } else if line.starts_with('+') {
            all_lines.push(DiffLine { r#type: "add".to_string(), line: Some(new_line), text: line.get(1..).unwrap_or("").to_string() });
            new_line += 1;
        } else if line.starts_with('-') {
            all_lines.push(DiffLine { r#type: "remove".to_string(), line: None, text: line.get(1..).unwrap_or("").to_string() });
        } else {
            all_lines.push(DiffLine { r#type: "context".to_string(), line: Some(new_line), text: line.get(1..).unwrap_or("").to_string() });
            new_line += 1;
        }
    }

    // Find target line position in all_lines
    let target_idx = all_lines.iter().position(|l| l.line == Some(target_line));

    match target_idx {
        None => all_lines, // return everything if line not found
        Some(idx) => {
            let start = idx.saturating_sub(context as usize);
            let end = (idx + context as usize + 1).min(all_lines.len());
            all_lines[start..end].to_vec()
        }
    }
}

/// Filter a unified diff to only include hunks for the given filenames.
/// Used for re-review-changed-files: only send diffs for files that changed since last review.
pub fn filter_diff_to_files(diff: &str, files: &[String]) -> String {
    let mut out = String::new();
    let mut include = false;
    let mut current_block = String::new();

    for line in diff.lines() {
        if line.starts_with("diff --git") {
            // Flush previous block
            if include && !current_block.is_empty() {
                out.push_str(&current_block);
            }
            current_block = format!("{line}\n");
            include = false;
        } else if line.starts_with("+++ b/") {
            let fname = &line[6..];
            include = files.iter().any(|f| f == fname);
            current_block.push_str(line);
            current_block.push('\n');
        } else {
            current_block.push_str(line);
            current_block.push('\n');
        }
    }
    // Flush last block
    if include && !current_block.is_empty() {
        out.push_str(&current_block);
    }
    out
}

fn parse_new_start(hunk: &str) -> Option<u32> {
    let plus = hunk.split('+').nth(1)?;
    let num = plus.split(',').next()?.split(' ').next()?;
    num.parse().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    // A minimal unified diff with two files
    const DIFF: &str = "\
diff --git a/lib/main.dart b/lib/main.dart
--- a/lib/main.dart
+++ b/lib/main.dart
@@ -1,6 +1,7 @@
 void main() {
   runApp(MyApp());
+  print('debug');
 }

 class MyApp {

diff --git a/lib/other.dart b/lib/other.dart
--- a/lib/other.dart
+++ b/lib/other.dart
@@ -10,4 +10,4 @@
 // comment
-  old();
+  newCall();
 }
";

    // Diff containing an empty context line (the regression case)
    const DIFF_WITH_EMPTY_LINE: &str = "\
diff --git a/a.dart b/a.dart
--- a/a.dart
+++ b/a.dart
@@ -1,4 +1,4 @@
 line one

+added after blank
 line three
";

    #[test]
    fn empty_diff_returns_empty_vec() {
        let result = extract_hunk_for_line("", "lib/main.dart", 3, 2);
        assert!(result.is_empty());
    }

    #[test]
    fn wrong_filename_returns_empty_vec() {
        let result = extract_hunk_for_line(DIFF, "nonexistent.dart", 3, 2);
        assert!(result.is_empty());
    }

    #[test]
    fn added_line_is_found_and_has_correct_type() {
        let result = extract_hunk_for_line(DIFF, "lib/main.dart", 3, 0);
        // With context=0 we get exactly 1 line: the add at new line 3
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].r#type, "add");
        assert_eq!(result[0].text, "  print('debug');");
    }

    #[test]
    fn context_lines_included_around_target() {
        let result = extract_hunk_for_line(DIFF, "lib/main.dart", 3, 1);
        // 1 context before + target + 1 context after = 3 lines
        assert_eq!(result.len(), 3);
        assert_eq!(result[1].r#type, "add"); // target in middle
    }

    #[test]
    fn second_file_extracted_correctly() {
        // lib/other.dart: @@ -10,4 +10,4 @@ — "newCall()" is added at new line 11
        let result = extract_hunk_for_line(DIFF, "lib/other.dart", 11, 0);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].r#type, "add");
        assert_eq!(result[0].text, "  newCall();");
    }

    #[test]
    fn context_at_boundary_does_not_panic() {
        // target line 1 with context 5 — start should clamp to 0
        let result = extract_hunk_for_line(DIFF, "lib/main.dart", 1, 5);
        assert!(!result.is_empty()); // should not panic or crash
    }

    #[test]
    fn empty_context_line_does_not_panic() {
        // Regression: blank context lines (empty string after stripping " ") must not panic
        let result = extract_hunk_for_line(DIFF_WITH_EMPTY_LINE, "a.dart", 3, 2);
        assert!(!result.is_empty());
    }

    #[test]
    fn empty_context_line_has_empty_text() {
        let result = extract_hunk_for_line(DIFF_WITH_EMPTY_LINE, "a.dart", 2, 3);
        let empty_line = result.iter().find(|l| l.r#type == "context" && l.text.is_empty());
        assert!(empty_line.is_some(), "expected a context line with empty text");
    }

    #[test]
    fn hunk_header_included_as_hunk_type() {
        // extract with enough context to capture the @@ line
        let result = extract_hunk_for_line(DIFF, "lib/main.dart", 1, 5);
        let hunk_lines: Vec<_> = result.iter().filter(|l| l.r#type == "hunk").collect();
        assert!(!hunk_lines.is_empty(), "expected at least one hunk-type line");
    }

    // ── filter_diff_to_files ─────────────────────────────────────────────────

    #[test]
    fn filter_includes_only_specified_file() {
        let files = vec!["lib/main.dart".to_string()];
        let filtered = filter_diff_to_files(DIFF, &files);
        assert!(filtered.contains("lib/main.dart"));
        assert!(!filtered.contains("lib/other.dart"));
    }

    #[test]
    fn filter_includes_multiple_files() {
        let files = vec!["lib/main.dart".to_string(), "lib/other.dart".to_string()];
        let filtered = filter_diff_to_files(DIFF, &files);
        assert!(filtered.contains("lib/main.dart"));
        assert!(filtered.contains("lib/other.dart"));
    }

    #[test]
    fn filter_returns_empty_for_no_match() {
        let files = vec!["does_not_exist.dart".to_string()];
        let filtered = filter_diff_to_files(DIFF, &files);
        assert!(filtered.is_empty());
    }

    #[test]
    fn filter_empty_diff_returns_empty() {
        let filtered = filter_diff_to_files("", &["any.dart".to_string()]);
        assert!(filtered.is_empty());
    }
}
