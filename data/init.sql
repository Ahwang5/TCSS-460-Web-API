-- Active: 1710457548247@@127.0.0.1@5432@tcss460@public

CREATE TABLE Account (
    account_id SERIAL PRIMARY KEY,
    firstname VARCHAR(255) NOT NULL,
    lastname VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL UNIQUE,
    account_role INTEGER NOT NULL
);

CREATE TABLE Account_Credential (
    credential_id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES Account(account_id),
    salted_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL
);

CREATE TABLE Book (
    book_id SERIAL PRIMARY KEY,
    isbn VARCHAR(13) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    original_title VARCHAR(255),
    author VARCHAR(255) NOT NULL,
    description TEXT,
    genre VARCHAR(50),
    publication_year INTEGER,
    price DECIMAL(10, 2),
    stock_quantity INTEGER,
    icon_url_large VARCHAR(255),
    icon_url_small VARCHAR(255)
);

CREATE TABLE Book_Rating (
    rating_id SERIAL PRIMARY KEY,
    book_id INTEGER REFERENCES Book(book_id),
    account_id INTEGER REFERENCES Account(account_id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (book_id, account_id)
);

-- Insert test user
INSERT INTO Account (firstname, lastname, username, email, phone, account_role)
VALUES ('Test', 'User', 'testuser', 'testuser@test.com', '1234567890', 1);

-- Insert test user credentials (password: newpassword123)
INSERT INTO Account_Credential (account_id, salted_hash, salt)
VALUES (1, 'fe2733a93853dbb5280aa09becb3e197', 'tcss460salt');

-- Insert sample books
INSERT INTO Book (isbn, title, original_title, author, description, genre, publication_year, price, stock_quantity, icon_url_large, icon_url_small)
VALUES 
('9780439554930', 'Harry Potter and the Sorcerer''s Stone', 'Harry Potter and the Philosopher''s Stone', 'J.K. Rowling', 'The first book in the Harry Potter series', 'Fantasy', 1997, 19.99, 100, 'https://images.example.com/hp1-large.jpg', 'https://images.example.com/hp1-small.jpg'),
('9780439064873', 'Harry Potter and the Chamber of Secrets', NULL, 'J.K. Rowling', 'The second book in the Harry Potter series', 'Fantasy', 1998, 19.99, 85, 'https://images.example.com/hp2-large.jpg', 'https://images.example.com/hp2-small.jpg'),
('9780439136365', 'Harry Potter and the Prisoner of Azkaban', NULL, 'J.K. Rowling', 'The third book in the Harry Potter series', 'Fantasy', 1999, 19.99, 75, 'https://images.example.com/hp3-large.jpg', 'https://images.example.com/hp3-small.jpg'),
('9780439139601', 'Harry Potter and the Goblet of Fire', NULL, 'J.K. Rowling', 'The fourth book in the Harry Potter series', 'Fantasy', 2000, 24.99, 60, 'https://images.example.com/hp4-large.jpg', 'https://images.example.com/hp4-small.jpg'),
('9780439358071', 'Harry Potter and the Order of the Phoenix', NULL, 'J.K. Rowling', 'The fifth book in the Harry Potter series', 'Fantasy', 2003, 24.99, 50, 'https://images.example.com/hp5-large.jpg', 'https://images.example.com/hp5-small.jpg'),
('9780439785969', 'Harry Potter and the Half-Blood Prince', NULL, 'J.K. Rowling', 'The sixth book in the Harry Potter series', 'Fantasy', 2005, 24.99, 40, 'https://images.example.com/hp6-large.jpg', 'https://images.example.com/hp6-small.jpg'),
('9780545139700', 'Harry Potter and the Deathly Hallows', NULL, 'J.K. Rowling', 'The seventh book in the Harry Potter series', 'Fantasy', 2007, 24.99, 30, 'https://images.example.com/hp7-large.jpg', 'https://images.example.com/hp7-small.jpg'),
('9780451524935', '1984', NULL, 'George Orwell', 'A dystopian novel about totalitarianism', 'Science Fiction', 1949, 14.99, 150, 'https://images.example.com/1984-large.jpg', 'https://images.example.com/1984-small.jpg'),
('9780061120084', 'To Kill a Mockingbird', NULL, 'Harper Lee', 'A story about racial injustice in the American South', 'Fiction', 1960, 14.99, 120, 'https://images.example.com/mockingbird-large.jpg', 'https://images.example.com/mockingbird-small.jpg'),
('9780141439518', 'Pride and Prejudice', NULL, 'Jane Austen', 'A classic romance novel', 'Romance', 1813, 9.99, 90, 'https://images.example.com/pride-large.jpg', 'https://images.example.com/pride-small.jpg');

-- Insert sample ratings
INSERT INTO Book_Rating (book_id, account_id, rating, review_text)
VALUES 
(1, 1, 5, 'An amazing start to the series!'),
(2, 1, 4, 'Great continuation of the story'),
(3, 1, 5, 'My favorite in the series'),
(8, 1, 5, 'A thought-provoking masterpiece'),
(9, 1, 4, 'A classic that everyone should read'),
(10, 1, 4, 'Beautifully written romance');

-- Function to reset test user password
CREATE OR REPLACE FUNCTION reset_test_user() RETURNS void AS $$
BEGIN
    UPDATE Account_Credential 
    SET salted_hash = 'fe2733a93853dbb5280aa09becb3e197', 
        salt = 'tcss460salt'
    WHERE account_id = 1;
END;
$$ LANGUAGE plpgsql;