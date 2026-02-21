const express = require('express');
const jwt = require('jsonwebtoken');
const books = require("./booksdb.js");
const regd_users = express.Router();

let users = [
    { "username": "cagri", "password": "32" },
    { "username": "user1", "password": "pwd1" },
    { "username": "user2", "password": "pwd2" }
];

const isValid = (username) => {
    return users.some(user => user.username === username); // Check if user exists
}

const authenticatedUser = (username, password) => {
    return users.some(user => user.username === username && user.password === password); // Validate user credentials
}

// Login route
regd_users.post("/login", (req, res) => {
    const { username, password } = req.query;

    if (!username || !password) {
        return res.status(404).json({ message: "Error logging in" });
    }

    if (authenticatedUser(username, password)) {
        let accessToken = jwt.sign({ data: password }, 'access', { expiresIn: 60 * 60 });
        req.session.authorization = { accessToken, username }; // Store the session token and username
        return res.status(200).send("User successfully logged in");
    } else {
        return res.status(208).json({ message: "Invalid Login. Check username and password" });
    }
});

// Review route (authenticated user can add or modify a review)
regd_users.put("/auth/review/:isbn", (req, res) => {
    const isbn = req.params.isbn;  // Get the ISBN from the URL
    const review = req.query.review;  // Get the review text from the query parameters

    console.log('Books in database:', books); // Log all books to check the data

    // Ensure the user is logged in
    if (!req.session.authorization) {
        return res.status(401).json({ message: "User not logged in" });
    }

    const { username } = req.session.authorization;  // Get the username from the session

    // Check the format of the ISBN and search for the book in the database
    const formattedIsbn = `isbn-${isbn}`;  // Ensure the ISBN is in the correct format

    const book = Object.values(books).find(book => book.isbn === formattedIsbn);

    if (!book) {
        return res.status(404).json({ message: `Book with ISBN ${formattedIsbn} not found` });
    }

    if (!review) {
        return res.status(400).json({ message: "Review is missing" });
    }

    const userReview = book.reviews.find(r => r.username === username);
    if (userReview) {
        // If the user has already reviewed the book, update the review
        userReview.review = review;
        return res.status(200).json({ message: `Review updated for user ${username} on book with ISBN ${formattedIsbn}` });
    } else {
        // If the user hasn't reviewed yet, add a new review
        book.reviews.push({ username, review });
        return res.status(200).json({ message: `Review added for user ${username} on book with ISBN ${formattedIsbn}` });
    }
});

// Delete a review route
regd_users.delete("/auth/review/:isbn", (req, res) => {
    const isbn = req.params.isbn;
    const { username } = req.session.authorization; // Get username from session

    if (!username) {
        return res.status(401).json({ message: "User not authenticated. Please log in." });
    }

    const book = Object.values(books).find(book => book.isbn === isbn);
    if (!book) {
        return res.status(404).json({ message: `Book with ISBN ${isbn} not found` });
    }

    const userReviewIndex = book.reviews.findIndex(r => r.username === username);
    if (userReviewIndex !== -1) {
        book.reviews.splice(userReviewIndex, 1); // Delete the review
        return res.status(200).json({ message: `Review deleted for user ${username} on book with ISBN ${isbn}` });
    } else {
        return res.status(404).json({ message: `No review found for user ${username} on book with ISBN ${isbn}` });
    }
});

module.exports.authenticated = regd_users;
module.exports.isValid = isValid;
module.exports.users = users;