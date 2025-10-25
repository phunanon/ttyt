import { PrismaClient } from "@prisma/client";
import express from "express";

export const prisma = new PrismaClient();
export const app = express();
export const sec = () => Math.floor(Date.now() / 1_000);

app.use((req, res, next) => {
  if (req.method === 'POST' && !req.is('application/json')) {
    req.headers['content-type'] = 'application/json';
  }
  next();
});
app.use(express.json({ limit: '1kb' }));

app.use('/public', express.static('public'));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
