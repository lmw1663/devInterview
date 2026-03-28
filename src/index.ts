import express from 'express';
import cors from 'cors';
import "./config/env";
import userRoutes from './routes/user.routes';
import questionRoutes from './routes/question.routes';
import interviewRoutes from './routes/interview.routes';
import answerRoutes from './routes/answer.routes';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/answers', answerRoutes);
app.get('/', (req, res) => {
    res.send('DevInterview API Running');
});

// const PORT = process.env.PORT || 3000;

app.listen(3000, () => {
    console.log('Server running');
})