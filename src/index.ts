import express from 'express';
import cors from 'cors';
import "./config/env";
import userRoutes from './routes/user.routes';
import questionRoutes from './routes/question.routes';
import interviewRoutes from './routes/interview.routes';
import answerRoutes from './routes/answer.routes';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './docs/openapi';

const app = express();
app.use(cors());
app.use(express.json());

app.use(
  (
    err: Error & { status?: number; statusCode?: number; type?: string },
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const status = err.status ?? err.statusCode;
    if (status === 400 && err.type === "entity.parse.failed") {
      return res.status(400).json({
        error: "Invalid JSON body",
        hint: "JSON does not allow a comma after the last array/object entry. Check your request payload.",
      });
    }
    next(err);
  }
);

app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.get('/', (req, res) => {
    res.send('DevInterview API Running');
});

// const PORT = process.env.PORT || 3000;

app.listen(3000, () => {
    console.log('Server running');
})