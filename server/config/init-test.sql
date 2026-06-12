-- ══════════════════════════════════════════════════════════════════════════
-- Initialize Test Database Schema (pernstore_test)
-- This script creates identical schema in the test database
-- NO psql meta-commands (like \connect) — only pure SQL
-- ══════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 1: Create ENUM type in test database
-- ══════════════════════════════════════════════════════════════════════════
CREATE TYPE pernstore_test.payment AS ENUM (
  'PAYSTACK',
  'STRIPE',
  'RAZORPAY'
);

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 2: Create tables in test database
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE pernstore_test.users (
    user_id SERIAL NOT NULL,
    password character varying(200),
    email character varying(100) UNIQUE NOT NULL,
    fullname character varying(100) NOT NULL,
    username character varying(50) UNIQUE NOT NULL,
    google_id character varying(100) UNIQUE,
    role character varying(10) DEFAULT 'user'::character varying NOT NULL,
    is_mfa_enabled boolean DEFAULT false NOT NULL,
    mfa_secret_enc text,
    mfa_secret_iv text,
    mfa_secret_tag text,
    address character varying(200),
    city character varying(100),
    state character varying(100),
    country character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id)
);

CREATE TABLE pernstore_test.products (
    product_id SERIAL NOT NULL,
    name character varying(100) NOT NULL UNIQUE,
    slug character varying(100) NOT NULL UNIQUE,
    price real NOT NULL,
    description text NOT NULL,
    image_url character varying,
    category character varying(50) DEFAULT 'Uncategorized' NOT NULL,
    PRIMARY KEY (product_id)
);

CREATE TABLE pernstore_test.cart (
    id SERIAL NOT NULL,
    user_id integer UNIQUE NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES pernstore_test.users (user_id) ON DELETE SET NULL
);

CREATE TABLE pernstore_test.cart_item (
    id SERIAL NOT NULL,
    cart_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (id),
    UNIQUE (cart_id, product_id),
    FOREIGN KEY (cart_id) REFERENCES pernstore_test.cart (id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES pernstore_test.products (product_id) ON DELETE SET NULL
);

CREATE TABLE pernstore_test.orders (
    order_id SERIAL NOT NULL,
    user_id integer NOT NULL,
    status character varying(20) NOT NULL,
    date timestamp without time zone DEFAULT CURRENT_DATE NOT NULL,
    amount real,
    total integer,
    ref character varying(100),
    payment_method pernstore_test.payment,
    PRIMARY KEY (order_id),
    FOREIGN KEY (user_id) REFERENCES pernstore_test.users (user_id) ON DELETE CASCADE
);

CREATE TABLE pernstore_test.order_item (
    id SERIAL NOT NULL,
    order_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (order_id) REFERENCES pernstore_test.orders (order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES pernstore_test.products (product_id) ON DELETE SET NULL
);

CREATE TABLE pernstore_test.reviews (
    user_id integer NOT NULL,
    content text NOT NULL,
    rating integer NOT NULL,
    product_id integer NOT NULL,
    date date NOT NULL,
    id integer NOT NULL,
    PRIMARY KEY (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES pernstore_test.users (user_id),
    FOREIGN KEY (product_id) REFERENCES pernstore_test.products (product_id)
);

CREATE TABLE pernstore_test."resetTokens" (
    id SERIAL NOT NULL,
    email character varying NOT NULL,
    token character varying NOT NULL,
    token_hash text,
    used boolean DEFAULT false NOT NULL,
    expiration timestamp without time zone,
    PRIMARY KEY (id)
);

CREATE TABLE pernstore_test.refresh_tokens (
    id SERIAL NOT NULL,
    user_id integer NOT NULL,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamp with time zone NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES pernstore_test.users (user_id)
);

-- ══════════════════════════════════════════════════════════════════════════
-- END: Test database initialization complete
-- ══════════════════════════════════════════════════════════════════════════
