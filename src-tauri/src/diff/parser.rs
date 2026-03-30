use std::collections::HashMap;

/// Parse a unified diff and return a map: filename → new_line_number → diff_position.
/// diff_position is the 1-based line number within the diff file (used by GitHub API).
pub fn parse_diff(raw_diff: &str) -> HashMap<String, HashMap<u32, u32>> {
    let mut result: HashMap<String, HashMap<u32, u32>> = HashMap::new();
    let mut current_file: Option<String> = None;
    let mut diff_position: u32 = 0;
    let mut new_line: u32 = 0;

    for line in raw_diff.lines() {
        if line.starts_with("diff --git ") {
            diff_position = 0;
            current_file = None;
        } else if line.starts_with("+++ b/") {
            let filename = line[6..].to_string();
            current_file = Some(filename);
            diff_position = 0;
        } else if line.starts_with("--- ") || line.starts_with("+++ ") {
            continue;
        } else if line.starts_with("@@ ") {
            // Parse new file start line: @@ -old,count +new,count @@
            if let Some(new_start) = parse_hunk_new_start(line) {
                new_line = new_start;
            }
            diff_position += 1;
        } else if let Some(ref file) = current_file.clone() {
            diff_position += 1;
            if line.starts_with('+') {
                let entry = result.entry(file.clone()).or_default();
                entry.insert(new_line, diff_position);
                new_line += 1;
            } else if line.starts_with('-') {
                // removed line — no new_line advance
            } else {
                // context line
                new_line += 1;
            }
        }
    }

    result
}

fn parse_hunk_new_start(hunk_header: &str) -> Option<u32> {
    // @@ -old_start,old_count +new_start,new_count @@
    let plus_part = hunk_header.split('+').nth(1)?;
    let num_part = plus_part.split(',').next()?.split(' ').next()?;
    num_part.parse().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    const SIMPLE_DIFF: &str = "\
diff --git a/src/main.rs b/src/main.rs
index 1234..5678 100644
--- a/src/main.rs
+++ b/src/main.rs
@@ -1,4 +1,5 @@
 fn main() {
-    println!(\"hello\");
+    println!(\"hello, world\");
+    println!(\"added line\");
 }
 // end
";

    const TWO_FILE_DIFF: &str = "\
diff --git a/foo.rs b/foo.rs
--- a/foo.rs
+++ b/foo.rs
@@ -1,2 +1,3 @@
 line one
+line added
 line two
diff --git a/bar.rs b/bar.rs
--- a/bar.rs
+++ b/bar.rs
@@ -5,3 +5,3 @@
 before
-old line
+new line
 after
";

    #[test]
    fn empty_diff_returns_empty_map() {
        let map = parse_diff("");
        assert!(map.is_empty());
    }

    #[test]
    fn parse_hunk_start_basic() {
        assert_eq!(parse_hunk_new_start("@@ -1,4 +1,5 @@"), Some(1));
    }

    #[test]
    fn parse_hunk_start_non_one() {
        assert_eq!(parse_hunk_new_start("@@ -10,3 +20,4 @@"), Some(20));
    }

    #[test]
    fn parse_hunk_start_invalid() {
        assert_eq!(parse_hunk_new_start("not a hunk"), None);
    }

    #[test]
    fn added_lines_mapped_to_diff_position() {
        let map = parse_diff(SIMPLE_DIFF);
        // File should be in the map
        assert!(map.contains_key("src/main.rs"), "map keys: {:?}", map.keys());
        let file_map = &map["src/main.rs"];
        // New lines: line 2 ("hello, world") and line 3 ("added line") were added
        // Both should have diff positions
        assert!(file_map.contains_key(&2), "line 2 missing: {:?}", file_map);
        assert!(file_map.contains_key(&3), "line 3 missing: {:?}", file_map);
    }

    #[test]
    fn context_lines_not_in_map() {
        let map = parse_diff(SIMPLE_DIFF);
        let file_map = &map["src/main.rs"];
        // Line 1 "fn main() {" is a context line — should NOT be in map (only added lines stored)
        assert!(!file_map.contains_key(&1), "context line 1 should not be mapped");
    }

    #[test]
    fn two_files_each_in_map() {
        let map = parse_diff(TWO_FILE_DIFF);
        assert!(map.contains_key("foo.rs"), "foo.rs missing");
        assert!(map.contains_key("bar.rs"), "bar.rs missing");
    }

    #[test]
    fn second_file_added_line_mapped() {
        let map = parse_diff(TWO_FILE_DIFF);
        // bar.rs: @@ -5,3 +5,3 @@ — "new line" is the added line at new-file line 6
        let bar = &map["bar.rs"];
        assert!(bar.contains_key(&6), "bar.rs line 6 missing: {:?}", bar);
    }

    #[test]
    fn diff_positions_are_positive() {
        let map = parse_diff(SIMPLE_DIFF);
        for pos in map["src/main.rs"].values() {
            assert!(*pos > 0, "positions must be 1-based");
        }
    }
}
