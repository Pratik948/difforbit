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
            all_lines.push(DiffLine { r#type: "add".to_string(), line: Some(new_line), text: line[1..].to_string() });
            new_line += 1;
        } else if line.starts_with('-') {
            all_lines.push(DiffLine { r#type: "remove".to_string(), line: None, text: line[1..].to_string() });
        } else {
            all_lines.push(DiffLine { r#type: "context".to_string(), line: Some(new_line), text: line[1..].to_string() });
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

fn parse_new_start(hunk: &str) -> Option<u32> {
    let plus = hunk.split('+').nth(1)?;
    let num = plus.split(',').next()?.split(' ').next()?;
    num.parse().ok()
}
