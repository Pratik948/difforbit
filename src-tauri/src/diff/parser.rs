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
