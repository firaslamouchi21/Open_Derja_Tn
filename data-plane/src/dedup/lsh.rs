use super::minhash::compute_minhash_signature;

pub const NEAR_DUPLICATE_THRESHOLD: f64 = 0.85;

pub fn estimate_jaccard_similarity(a: &[u64], b: &[u64]) -> f64 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    let matches = a.iter().zip(b.iter()).filter(|(x, y)| x == y).count();
    matches as f64 / a.len() as f64
}

pub struct NearDuplicateMatch {
    pub id: String,
    pub similarity: f64,
}

pub fn find_near_duplicates(text: &str, candidates: &[(String, String)]) -> Vec<NearDuplicateMatch> {
    let signature = compute_minhash_signature(text);

    candidates
        .iter()
        .filter_map(|(id, candidate_text)| {
            let candidate_signature = compute_minhash_signature(candidate_text);
            let similarity = estimate_jaccard_similarity(&signature, &candidate_signature);
            if similarity >= NEAR_DUPLICATE_THRESHOLD {
                Some(NearDuplicateMatch { id: id.clone(), similarity })
            } else {
                None
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn returns_one_for_identical_signatures() {
        let sig = compute_minhash_signature("chnowa hwelek");
        assert_eq!(estimate_jaccard_similarity(&sig, &sig), 1.0);
    }

    #[test]
    fn returns_zero_when_signatures_differ_in_length() {
        assert_eq!(estimate_jaccard_similarity(&[1, 2], &[1, 2, 3]), 0.0);
    }

    #[test]
    fn returns_zero_for_two_empty_signatures() {
        let empty: Vec<u64> = vec![];
        assert_eq!(estimate_jaccard_similarity(&empty, &empty), 0.0);
    }

    #[test]
    fn flags_whitespace_only_variation_as_near_duplicate() {
        let a = compute_minhash_signature("chnowa hwelek ya sahbi kifeh ahwelek");
        let b = compute_minhash_signature("chnowa   hwelek ya sahbi kifeh ahwelek");
        assert!(estimate_jaccard_similarity(&a, &b) >= NEAR_DUPLICATE_THRESHOLD);
    }

    #[test]
    fn find_near_duplicates_returns_only_matches_above_threshold() {
        let candidates = vec![
            ("exact".to_string(), "chnowa hwelek ya sahbi".to_string()),
            ("whitespace-variant".to_string(), "chnowa   hwelek ya sahbi".to_string()),
            ("unrelated".to_string(), "completely different topic entirely here".to_string()),
        ];

        let matches = find_near_duplicates("chnowa hwelek ya sahbi", &candidates);
        let matched_ids: Vec<&str> = matches.iter().map(|m| m.id.as_str()).collect();

        assert!(matched_ids.contains(&"exact"));
        assert!(matched_ids.contains(&"whitespace-variant"));
        assert!(!matched_ids.contains(&"unrelated"));
    }

    #[test]
    fn find_near_duplicates_returns_empty_when_no_candidates_match() {
        let candidates = vec![("unrelated".to_string(), "totally different sentence".to_string())];
        let matches = find_near_duplicates("chnowa hwelek ya sahbi", &candidates);
        assert!(matches.is_empty());
    }
}
