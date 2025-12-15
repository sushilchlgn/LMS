const express = require('express')
const cors = require('cors')
const db = require('./db')

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())

// --- GET all books ---
app.get('/books', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM books')
        res.status(200).json(rows)
    } catch (err) {
        console.error('Error fetching books: ', err)
        res.status(500).json({ error: 'Failed to fetch books' })
    }
})

// --- GET a single book by ID ---
app.get('/books/:id', async (req, res) => {
    const bookId = req.params.id
    try {
        const [rows] = await db.query('SELECT * FROM books WHERE id = ?', [bookId])
        if (rows.length === 0) return res.status(404).json({ error: 'Book not found' })
        res.status(200).json(rows[0])
    } catch (err) {
        console.error('Error fetching book: ', err)
        res.status(500).json({ error: 'Failed to fetch book' })
    }
})

// --- POST add a new book ---
app.post('/books', async (req, res) => {
    const { title, author, category, isbn, total_copies } = req.body
    if (!title || !author || !total_copies) {
        return res.status(400).json({ error: "Title, author and total_copies are required" })
    }

    try {
        const query = 'INSERT INTO books (title, author, category, isbn, total_copies, available_copies) VALUES (?,?,?,?,?,?)'
        const [result] = await db.query(query, [title, author, category, isbn, total_copies, total_copies])

        res.status(201).json({
            message: 'Book added successfully',
            id: result.insertId
        })
    } catch (err) {
        console.error('Error adding book: ', err);
        res.status(500).json({ error: 'Failed to add book' })
    }
})

// --- PUT update book ---
app.put('/books/:id', async (req, res) => {
    const bookId = req.params.id
    const { title, author, category, total_copies } = req.body

    const updates = []
    const values = []

    if (title !== undefined) { updates.push('title=?'); values.push(title) }
    if (author !== undefined) { updates.push('author=?'); values.push(author) }
    if (category !== undefined) { updates.push('category=?'); values.push(category) }
    if (total_copies !== undefined) { 
        updates.push('total_copies=?', 'available_copies=?'); 
        values.push(total_copies, total_copies) 
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Provide at least one field to update.' })

    values.push(bookId)

    try {
        const [result] = await db.query(`UPDATE books SET ${updates.join(', ')} WHERE id=?`, values)
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Book not found' })
        res.status(200).json({ message: 'Book updated successfully' })
    } catch (err) {
        console.error('Error updating book: ', err)
        res.status(500).json({ error: 'Failed to update book' })
    }
})

// --- DELETE book ---
app.delete('/books/:id', async (req, res) => {
    const bookId = req.params.id
    try {
        const [result] = await db.query('DELETE FROM books WHERE id=?', [bookId])
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Book not found' })
        res.status(204).send()
    } catch (err) {
        console.error('Error deleting book: ', err)
        res.status(500).json({ error: 'Failed to delete book' })
    }
})

// --- Issue book ---
app.post('/books/:id/issue', async (req, res) => {
    const bookId = req.params.id
    try {
        const [rows] = await db.query('SELECT available_copies FROM books WHERE id=?', [bookId])
        if (!rows.length || rows[0].available_copies <= 0) 
            return res.status(400).json({ error: 'Book not available' })

        await db.query('UPDATE books SET available_copies=available_copies-1 WHERE id=?', [bookId])
        res.json({ message: 'Book issued successfully' })
    } catch (err) {
        console.error('Error issuing book: ', err)
        res.status(500).json({ error: 'Failed to issue book' })
    }
})

// --- Return book ---
app.post('/books/:id/return', async (req, res) => {
    const bookId = req.params.id
    try {
        const [rows] = await db.query('SELECT total_copies, available_copies FROM books WHERE id=?', [bookId])
        if (!rows.length || rows[0].available_copies >= rows[0].total_copies) 
            return res.status(400).json({ error: 'All copies are already returned' })

        await db.query('UPDATE books SET available_copies=available_copies+1 WHERE id=?', [bookId])
        res.json({ message: 'Book returned successfully' })
    } catch (err) {
        console.error('Error returning book: ', err)
        res.status(500).json({ error: 'Failed to return book' })
    }
})

app.listen(PORT, () => {
    console.log(`Library server running at http://localhost:${PORT}`)
})
