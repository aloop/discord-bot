CREATE TABLE token_prices (
    id INTEGER PRIMARY KEY,
    updated_at INTEGER UNIQUE NOT NULL,
    price INTEGER NOT NULL
);
