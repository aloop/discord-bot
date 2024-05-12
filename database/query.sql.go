// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.26.0
// source: query.sql

package database

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

const addFreeGame = `-- name: AddFreeGame :one
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
RETURNING id, store_id, title, description, url, thumbnail_url, start_date, end_date
`

type AddFreeGameParams struct {
	StoreID      string
	Title        string
	Description  string
	Url          string
	ThumbnailUrl string
	StartDate    pgtype.Timestamptz
	EndDate      pgtype.Timestamptz
}

func (q *Queries) AddFreeGame(ctx context.Context, arg AddFreeGameParams) (EgsFreeGame, error) {
	row := q.db.QueryRow(ctx, addFreeGame,
		arg.StoreID,
		arg.Title,
		arg.Description,
		arg.Url,
		arg.ThumbnailUrl,
		arg.StartDate,
		arg.EndDate,
	)
	var i EgsFreeGame
	err := row.Scan(
		&i.ID,
		&i.StoreID,
		&i.Title,
		&i.Description,
		&i.Url,
		&i.ThumbnailUrl,
		&i.StartDate,
		&i.EndDate,
	)
	return i, err
}

const addTokenPrice = `-- name: AddTokenPrice :one
INSERT INTO wow_token_prices (
    updated, price
) VALUES (
    $1, $2
)
RETURNING id, updated, price
`

type AddTokenPriceParams struct {
	Updated pgtype.Timestamptz
	Price   int64
}

func (q *Queries) AddTokenPrice(ctx context.Context, arg AddTokenPriceParams) (WowTokenPrice, error) {
	row := q.db.QueryRow(ctx, addTokenPrice, arg.Updated, arg.Price)
	var i WowTokenPrice
	err := row.Scan(&i.ID, &i.Updated, &i.Price)
	return i, err
}

const getAllFreeGames = `-- name: GetAllFreeGames :many
SELECT id, store_id, title, description, url, thumbnail_url, start_date, end_date from egs_free_games ORDER BY id DESC
`

func (q *Queries) GetAllFreeGames(ctx context.Context) ([]EgsFreeGame, error) {
	rows, err := q.db.Query(ctx, getAllFreeGames)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []EgsFreeGame
	for rows.Next() {
		var i EgsFreeGame
		if err := rows.Scan(
			&i.ID,
			&i.StoreID,
			&i.Title,
			&i.Description,
			&i.Url,
			&i.ThumbnailUrl,
			&i.StartDate,
			&i.EndDate,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getAllTokenPrices = `-- name: GetAllTokenPrices :many
SELECT id, updated, price FROM wow_token_prices ORDER BY id DESC
`

func (q *Queries) GetAllTokenPrices(ctx context.Context) ([]WowTokenPrice, error) {
	rows, err := q.db.Query(ctx, getAllTokenPrices)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []WowTokenPrice
	for rows.Next() {
		var i WowTokenPrice
		if err := rows.Scan(&i.ID, &i.Updated, &i.Price); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getAllTokenPricesSince = `-- name: GetAllTokenPricesSince :many
SELECT price, updated FROM wow_token_prices WHERE updated >= $1 ORDER BY id DESC
`

type GetAllTokenPricesSinceRow struct {
	Price   int64
	Updated pgtype.Timestamptz
}

func (q *Queries) GetAllTokenPricesSince(ctx context.Context, updated pgtype.Timestamptz) ([]GetAllTokenPricesSinceRow, error) {
	rows, err := q.db.Query(ctx, getAllTokenPricesSince, updated)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetAllTokenPricesSinceRow
	for rows.Next() {
		var i GetAllTokenPricesSinceRow
		if err := rows.Scan(&i.Price, &i.Updated); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getCurrentFreeGames = `-- name: GetCurrentFreeGames :many
SELECT id, store_id, title, description, url, thumbnail_url, start_date, end_date from egs_free_games WHERE start_date < NOW() AND end_date > NOW() ORDER BY id DESC
`

func (q *Queries) GetCurrentFreeGames(ctx context.Context) ([]EgsFreeGame, error) {
	rows, err := q.db.Query(ctx, getCurrentFreeGames)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []EgsFreeGame
	for rows.Next() {
		var i EgsFreeGame
		if err := rows.Scan(
			&i.ID,
			&i.StoreID,
			&i.Title,
			&i.Description,
			&i.Url,
			&i.ThumbnailUrl,
			&i.StartDate,
			&i.EndDate,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getLatestTokenPrice = `-- name: GetLatestTokenPrice :one
SELECT id, updated, price FROM wow_token_prices ORDER BY id DESC LIMIT 1
`

func (q *Queries) GetLatestTokenPrice(ctx context.Context) (WowTokenPrice, error) {
	row := q.db.QueryRow(ctx, getLatestTokenPrice)
	var i WowTokenPrice
	err := row.Scan(&i.ID, &i.Updated, &i.Price)
	return i, err
}