create table if not exists users (
    id            bigserial primary key,
    email         text        not null unique,
    name          text        not null,
    password_hash text        not null,
    created_at    timestamptz not null default now()
);

create table if not exists quizzes (
    id          bigserial primary key,
    owner_id    bigint      not null references users (id) on delete cascade,
    title       text        not null,
    description text        not null default '',
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index if not exists quizzes_owner_idx on quizzes (owner_id);

create table if not exists questions (
    id             bigserial primary key,
    quiz_id        bigint not null references quizzes (id) on delete cascade,
    position       int    not null,
    text           text   not null,
    time_limit     int    not null,
    correct_option int    not null,
    unique (quiz_id, position)
);

create table if not exists question_options (
    question_id bigint not null references questions (id) on delete cascade,
    position    int    not null,
    text        text   not null,
    primary key (question_id, position)
);

create table if not exists games (
    id          bigserial primary key,
    quiz_id     bigint      references quizzes (id) on delete set null,
    host_id     bigint      not null references users (id) on delete cascade,
    quiz_title  text        not null,
    pin         text        not null,
    started_at  timestamptz not null,
    finished_at timestamptz not null
);

create index if not exists games_host_idx on games (host_id, finished_at desc);

create table if not exists game_players (
    id      bigserial primary key,
    game_id bigint not null references games (id) on delete cascade,
    name    text   not null,
    score   int    not null,
    correct int    not null,
    place   int    not null
);

create index if not exists game_players_game_idx on game_players (game_id);
