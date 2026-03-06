const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const WinstonCloudWatch = require('winston-cloudwatch');
const path = require('path');

const SERVICE_NAME = require(path.resolve(__dirname, '../../package.json')).name;

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

const structuredFormat = combine(
  errors({ stack: true }),
  timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  json()
);

const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp, ...meta }) => {
    const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${timestamp} [${level}]: ${message}${extra}`;
  })
);

const rotateOptions = (level) => ({
  dirname: 'logs',
  filename: `${level}-%DATE%.log`,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level,
  format: structuredFormat
});

const transports = [
  new DailyRotateFile(rotateOptions('error')),
  new DailyRotateFile({ ...rotateOptions('info'), filename: 'combined-%DATE%.log' })
];

if (process.env.CLOUDWATCH_GROUP) {
  transports.push(new WinstonCloudWatch({
    logGroupName: process.env.CLOUDWATCH_GROUP,
    logStreamName: SERVICE_NAME,
    awsRegion: process.env.CLOUDWATCH_REGION || 'ap-south-1',
    messageFormatter: ({ level, message, ...meta }) =>
      JSON.stringify({ level, message, service: SERVICE_NAME, ...meta })
  }));
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: SERVICE_NAME },
  transports
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({ format: consoleFormat }));
}

module.exports = logger;
