const express = require('express')
const cors = require('cors')
const db = require('./db') // Your MySQL connection module

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
        console.error('Error fetching books:', err)
        res.status(500).json({ error: 'Failed to fetch books' })
    }
})

// --- GET single book ---
app.get('/books/:id', async (req, res) => {
    const bookId = req.params.id
    try {
        const [rows] = await db.query('SELECT * FROM books WHERE id=?', [bookId])
        if (!rows.length) return res.status(404).json({ error: 'Book not found' })
        res.status(200).json(rows[0])
    } catch (err) {
        console.error('Error fetching book:', err)
        res.status(500).json({ error: 'Failed to fetch book' })
    }
})

// --- GET borrowing history for a book ---
app.get('/books/:id/history', async (req, res) => {
    const bookId = req.params.id
    try {
        const [rows] = await db.query(
            'SELECT id, user_name, issued_at, returned_at FROM borrowed_books WHERE book_id=? ORDER BY issued_at DESC',
            [bookId]
        )
        res.json(rows)
    } catch (err) {
        console.error('Error fetching history:', err)
        res.status(500).json({ error: 'Failed to fetch history' })
    }
})

// --- POST add new book ---
app.post('/books', async (req, res) => {
    const { title, author, category, isbn, total_copies } = req.body
    if (!title || !author || !total_copies) {
        return res.status(400).json({ error: 'Title, author and total_copies are required' })
    }

    try {
        const [result] = await db.query(
            'INSERT INTO books (title, author, category, isbn, total_copies, available_copies) VALUES (?,?,?,?,?,?)',
            [title, author, category, isbn, total_copies, total_copies]
        )
        res.status(201).json({ message: 'Book added successfully', id: result.insertId })
    } catch (err) {
        console.error('Error adding book:', err)
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

    if (!updates.length) return res.status(400).json({ error: 'Provide at least one field to update.' })

    values.push(bookId)

    try {
        const [result] = await db.query(`UPDATE books SET ${updates.join(', ')} WHERE id=?`, values)
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Book not found' })
        res.json({ message: 'Book updated successfully' })
    } catch (err) {
        console.error('Error updating book:', err)
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
        console.error('Error deleting book:', err)
        res.status(500).json({ error: 'Failed to delete book' })
    }
})

// --- Issue book ---
app.post('/books/:id/issue', async (req, res) => {
    const bookId = req.params.id
    const { user_name } = req.body
    if (!user_name) return res.status(400).json({ error: 'User name is required' })

    try {
        const [rows] = await db.query('SELECT available_copies FROM books WHERE id=?', [bookId])
        if (!rows.length || rows[0].available_copies <= 0)
            return res.status(400).json({ error: 'Book not available' })

        await db.query('UPDATE books SET available_copies=available_copies-1 WHERE id=?', [bookId])
        await db.query('INSERT INTO borrowed_books (book_id, user_name) VALUES (?,?)', [bookId, user_name])

        res.json({ message: 'Book issued successfully' })
    } catch (err) {
        console.error('Error issuing book:', err)
        res.status(500).json({ error: 'Failed to issue book' })
    }
})

// --- Return book ---
app.post('/books/:id/return', async (req, res) => {
    const bookId = req.params.id
    const { user_name } = req.body
    if (!user_name) return res.status(400).json({ error: 'User name is required' })

    try {
        const [rows] = await db.query('SELECT total_copies, available_copies FROM books WHERE id=?', [bookId])
        if (!rows.length || rows[0].available_copies >= rows[0].total_copies)
            return res.status(400).json({ error: 'All copies are already returned' })

        await db.query('UPDATE books SET available_copies=available_copies+1 WHERE id=?', [bookId])
        await db.query(
            'UPDATE borrowed_books SET returned_at=CURRENT_TIMESTAMP WHERE book_id=? AND user_name=? AND returned_at IS NULL',
            [bookId, user_name]
        )

        res.json({ message: 'Book returned successfully' })
    } catch (err) {
        console.error('Error returning book:', err)
        res.status(500).json({ error: 'Failed to return book' })
    }
})

app.listen(PORT, () => {
    console.log(`Library server running at http://localhost:${PORT}`)
})
