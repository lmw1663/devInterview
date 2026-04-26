import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import pinoHttp from 'pino-http';
import { env } from "./config/env";
import userRoutes from './routes/user.routes';
import questionRoutes from './routes/question.routes';
import interviewRoutes from './routes/interview.routes';
import answerRoutes from './routes/answer.routes';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './docs/openapi';
import { startAiWorker } from './workers/ai.worker';
import redis from './lib/redis';
import prisma from './lib/prisma';
import logger from './lib/logger';
import { aiQueue } from './queues/ai.queue';

const app = express();

// 개발환경: HSTS 비활성화 (HTTP 서버에서 HSTS를 보내면 브라우저가 HTTPS로 강제 업그레이드)
// /api-docs: CSP도 비활성화 (Swagger UI는 인라인 스크립트 사용)
const helmetOptions = { hsts: env.NODE_ENV === 'production' };
app.use('/api-docs', helmet({ ...helmetOptions, contentSecurityPolicy: false }));
app.use(/^(?!\/api-docs).*$/, helmet(helmetOptions));
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

// 구조화 로깅
app.use(pinoHttp({ logger }));

// Rate Limiting (유저당 분당 20회)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendCommand: (command: string, ...args: string[]) => (redis as any).call(command, ...args),
  }),
});
app.use('/api', limiter);

// JSON 파싱 에러 핸들러
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
        hint: "JSON does not allow a comma after the last array/object entry.",
      });
    }
    next(err);
  }
);

// Bull Board 모니터링 UI (GET /admin/queues)
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({ queues: [new BullMQAdapter(aiQueue)], serverAdapter });
app.use('/admin/queues', serverAdapter.getRouter());

// API 라우트
app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.get('/', (_req, res) => {
  res.send('DevInterview API Running');
});

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redisStatus = redis.status;
    res.json({
      status: 'ok',
      db: 'connected',
      redis: redisStatus === 'ready' ? 'connected' : redisStatus,
    });
  } catch (e) {
    res.status(503).json({ status: 'error', error: e instanceof Error ? e.message : String(e) });
  }
});

// 워커 시작
startAiWorker();

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Server running');
});
