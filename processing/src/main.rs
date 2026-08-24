use actix_web::{get, App, HttpServer, HttpResponse};
use serde::Serialize;

mod audit_diff;
mod dedup;
mod export;
mod media;
mod normalize;

#[derive(Serialize)]
struct Health {
    status: &'static str,
}

#[get("/health")]
async fn health() -> HttpResponse {
    HttpResponse::Ok().json(Health { status: "ok" })
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| App::new().service(health))
        .bind(("0.0.0.0", 8002))?
        .run()
        .await
}
