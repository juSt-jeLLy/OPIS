import { createApp } from "./app";
import { loadConfig } from "./shared/config/env";
import { createContainer } from "./shared/container/create-container";
import { logger } from "./shared/logger/logger";

const bootstrap = async (): Promise<void> => {
  const config = loadConfig();
  const container = createContainer(config, logger);
  const app = createApp(container, config, logger);
  const server = app.listen(config.port, () => {
    logger.info("OPIS monitoring backend started", { port: config.port });
  });

  await container.ingestionService.start();

  const shutdown = (): void => {
    container.ingestionService.stop();
    server.close(() => {
      logger.info("OPIS monitoring backend stopped");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

void bootstrap();
