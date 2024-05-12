-- name: GetLatestTokenPrice :one
SELECT * FROM wow_token_prices ORDER BY id DESC LIMIT 1;

-- name: GetAllTokenPrices :many
SELECT * FROM wow_token_prices ORDER BY id DESC;

-- name: GetAllTokenPricesSince :many
SELECT price, updated FROM wow_token_prices WHERE updated >= $1 ORDER BY id DESC;

-- name: AddTokenPrice :one
INSERT INTO wow_token_prices (
    updated, price
) VALUES (
    $1, $2
)
RETURNING *;

-- name: GetCurrentFreeGames :many
SELECT * from egs_free_games WHERE start_date < NOW() AND end_date > NOW() ORDER BY id DESC;

-- name: GetAllFreeGames :many
SELECT * from egs_free_games ORDER BY id DESC;

-- name: AddFreeGame :one
INSERT INTO egs_free_games (
    store_id,
    title,
    description,
    url,
    thumbnail_url,
    start_date,
    end_date
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;