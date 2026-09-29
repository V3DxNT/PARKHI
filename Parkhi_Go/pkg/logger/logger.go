package logger

import (
	"fmt"
	"log"
	"os"
	"time"
)

type Logger struct {
	infoLog  *log.Logger
	warnLog  *log.Logger
	errorLog *log.Logger
}

var DefaultLogger = New()

func New() *Logger {
	return &Logger{
		infoLog:  log.New(os.Stdout, "[INFO]  ", 0),
		warnLog:  log.New(os.Stdout, "[WARN]  ", 0),
		errorLog: log.New(os.Stderr, "[ERROR] ", 0),
	}
}

func (l *Logger) Info(format string, v ...interface{}) {
	msg := fmt.Sprintf(format, v...)
	l.infoLog.Printf("%s | %s", time.Now().Format("2006-01-02 15:04:05"), msg)
}

func (l *Logger) Warn(format string, v ...interface{}) {
	msg := fmt.Sprintf(format, v...)
	l.warnLog.Printf("%s | %s", time.Now().Format("2006-01-02 15:04:05"), msg)
}

func (l *Logger) Error(format string, v ...interface{}) {
	msg := fmt.Sprintf(format, v...)
	l.errorLog.Printf("%s | %s", time.Now().Format("2006-01-02 15:04:05"), msg)
}

func Info(format string, v ...interface{}) {
	DefaultLogger.Info(format, v...)
}

func Warn(format string, v ...interface{}) {
	DefaultLogger.Warn(format, v...)
}

func Error(format string, v ...interface{}) {
	DefaultLogger.Error(format, v...)
}
