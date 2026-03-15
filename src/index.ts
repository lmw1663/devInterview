import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/user.routes';

dotenv.config()

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
           
app.get('/', (req, res) => {
    res.send('DevInterview API Running');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('Server running on port ${PORT}');
})