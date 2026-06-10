export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? 3333),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  appPublicUrl: process.env.APP_PUBLIC_URL ?? "http://localhost:5173",
  db: {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.MYSQL_USER ?? "hubly_ticket",
    password: process.env.MYSQL_PASSWORD ?? "hubly_ticket",
    database: process.env.MYSQL_DATABASE ?? "hubly_ticket"
  },
  admin: {
    name: process.env.ADMIN_NAME ?? "Administrador",
    email: process.env.ADMIN_EMAIL ?? "admin@hublyapp.com.br",
    password: process.env.ADMIN_PASSWORD ?? "admin123"
  },
  evolution: {
    url: process.env.EVOLUTION_API_URL ?? "",
    apiKey: process.env.EVOLUTION_API_KEY ?? "",
    instance: process.env.EVOLUTION_INSTANCE_NAME ?? "",
    notifyPhone: process.env.WHATSAPP_NOTIFY_PHONE ?? ""
  }
};
