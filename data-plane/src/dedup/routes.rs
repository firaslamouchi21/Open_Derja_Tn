use actix_web::{post, web, HttpResponse};
use serde::{Deserialize, Serialize};

use super::find_near_duplicates;

#[derive(Deserialize)]
struct DedupCandidate {
    id: String,
    text: String,
}

#[derive(Deserialize)]
struct DedupCheckRequest {
    text: String,
    candidates: Vec<DedupCandidate>,
}

#[derive(Serialize)]
struct DedupMatch {
    id: String,
    similarity: f64,
}

#[derive(Serialize)]
struct DedupCheckResponse {
    is_near_duplicate: bool,
    matches: Vec<DedupMatch>,
}

#[post("/dedup/check")]
pub async fn check(payload: web::Json<DedupCheckRequest>) -> HttpResponse {
    let candidates: Vec<(String, String)> = payload
        .candidates
        .iter()
        .map(|c| (c.id.clone(), c.text.clone()))
        .collect();

    let matches = find_near_duplicates(&payload.text, &candidates);

    HttpResponse::Ok().json(DedupCheckResponse {
        is_near_duplicate: !matches.is_empty(),
        matches: matches
            .into_iter()
            .map(|m| DedupMatch { id: m.id, similarity: m.similarity })
            .collect(),
    })
}
