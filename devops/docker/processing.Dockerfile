FROM rust:1-slim AS build

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release --locked

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/target/release/opendarja-processing /usr/local/bin/opendarja-processing

EXPOSE 8002

CMD ["opendarja-processing"]
