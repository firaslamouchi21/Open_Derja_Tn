use std::collections::HashSet;

const SHINGLE_SIZE: usize = 3;
const HASH_FUNCTION_COUNT: usize = 64;
const HASH_MULTIPLIER: u32 = 2654435761;

fn hash_seeds() -> [u32; HASH_FUNCTION_COUNT] {
    let mut seeds = [0u32; HASH_FUNCTION_COUNT];
    for (i, seed) in seeds.iter_mut().enumerate() {
        *seed = ((i as u32) + 1).wrapping_mul(HASH_MULTIPLIER);
    }
    seeds
}

fn normalise_whitespace(text: &str) -> String {
    let mut result = String::with_capacity(text.len());
    let mut last_was_space = false;
    for ch in text.trim().chars() {
        if ch.is_whitespace() {
            if !last_was_space {
                result.push(' ');
                last_was_space = true;
            }
        } else {
            result.push(ch);
            last_was_space = false;
        }
    }
    result
}

fn shingle(text: &str) -> HashSet<String> {
    let normalised = normalise_whitespace(text);
    let chars: Vec<char> = normalised.chars().collect();

    if chars.len() < SHINGLE_SIZE {
        return HashSet::from([normalised]);
    }

    let mut shingles = HashSet::new();
    for i in 0..=(chars.len() - SHINGLE_SIZE) {
        shingles.insert(chars[i..i + SHINGLE_SIZE].iter().collect());
    }
    shingles
}

fn hash32(value: &str, seed: u32) -> u32 {
    let mut hash = seed;
    for ch in value.chars() {
        hash = (hash ^ (ch as u32)).wrapping_mul(HASH_MULTIPLIER);
        hash ^= hash >> 15;
    }
    hash
}

pub fn compute_minhash_signature(text: &str) -> Vec<u64> {
    let shingles = shingle(text);
    let seeds = hash_seeds();
    let mut signature = vec![u64::MAX; HASH_FUNCTION_COUNT];

    for s in &shingles {
        for i in 0..HASH_FUNCTION_COUNT {
            let hashed = hash32(s, seeds[i]) as u64;
            if hashed < signature[i] {
                signature[i] = hashed;
            }
        }
    }
    signature
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn is_deterministic_for_the_same_text() {
        let text = "chnowa hwelek ya sahbi";
        assert_eq!(compute_minhash_signature(text), compute_minhash_signature(text));
    }

    #[test]
    fn produces_one_hash_per_hash_function() {
        let signature = compute_minhash_signature("chnowa hwelek ya sahbi");
        assert_eq!(signature.len(), HASH_FUNCTION_COUNT);
    }

    #[test]
    fn differs_for_clearly_different_text() {
        let a = compute_minhash_signature("chnowa hwelek ya sahbi, kifeh ahwelek el yom");
        let b = compute_minhash_signature("completely unrelated english sentence about weather patterns");
        assert_ne!(a, b);
    }

    #[test]
    fn handles_text_shorter_than_a_shingle() {
        let signature = compute_minhash_signature("hi");
        assert_eq!(signature.len(), HASH_FUNCTION_COUNT);
    }

    #[test]
    fn handles_arabic_script_text() {
        let signature = compute_minhash_signature("برشا حلو هالكلام");
        assert_eq!(signature.len(), HASH_FUNCTION_COUNT);
        assert!(signature.iter().any(|&v| v != u64::MAX));
    }
}
