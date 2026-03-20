import express from 'express';
import cors from 'cors';
import "./config/env";
import userRoutes from './routes/user.routes';
import questionRoutes from './routes/question.routes';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.get('/', (req, res) => {
    res.send('DevInterview API Running');
});

// const PORT = process.env.PORT || 3000;

app.listen(3000, () => {
    console.log('Server running');
})