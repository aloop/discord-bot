CREATE TABLE IF NOT EXISTS wow_token_prices (
    id         BIGSERIAL PRIMARY KEY,
    updated    TIMESTAMP WITH TIME ZONE UNIQUE NOT NULL,
    price      BIGINT    NOT NULL
);

CREATE TABLE IF NOT EXISTS egs_free_games (
    id            BIGSERIAL PRIMARY KEY,
    store_id      TEXT NOT NULL,
    title         TEXT NOT NULL,
    description   TEXT NOT NULL,
    url           TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    start_date    TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date      TIMESTAMP WITH TIME ZONE NOT NULL
);