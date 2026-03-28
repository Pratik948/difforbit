/// DiffOrbit logging wrapper.
///
/// Uses `tracing` as the logging facade so callers are completely decoupled
/// from the backing implementation. To swap the backend in future (e.g. to
/// OpenTelemetry, Datadog, or a custom sink), only this file needs changing.
///
/// Usage anywhere in the codebase:
///   use tracing::{info, warn, error, debug};
///   info!("fetching diff for PR #{}", number);
///   error!(repo = %repo, err = %e, "gh command failed");
///
/// Log files rotate daily and are kept for 7 days.
/// Location: <app-data-dir>/logs/difforbit.log
///          (~/Library/Application Support/DiffOrbit/logs/ on macOS)

use tracing_appender::non_blocking::WorkerGuard;
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::fmt::time::ChronoLocal;
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

/// Keep this alive for the entire duration of the process.
/// Dropping it flushes and closes the file writer.
pub struct LogGuard(WorkerGuard);

/// Initialise file + stderr logging.
///
/// `log_dir` — directory where log files are written (created if missing).
///
/// Log level is controlled by the `RUST_LOG` env var, defaulting to `info`.
/// Example: `RUST_LOG=difforbit=debug` for debug-level app logs only.
pub fn init(log_dir: &std::path::Path) -> LogGuard {
    let _ = std::fs::create_dir_all(log_dir);

    // Rolling daily appender — keeps writing to difforbit.YYYY-MM-DD.log
    let file_appender = RollingFileAppender::builder()
        .rotation(Rotation::DAILY)
        .filename_prefix("difforbit")
        .filename_suffix("log")
        .max_log_files(7)
        .build(log_dir)
        .expect("failed to create log file appender");

    let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);

    // File layer — no ANSI colours, human-readable timestamps
    let file_layer = fmt::layer()
        .with_writer(non_blocking)
        .with_ansi(false)
        .with_timer(ChronoLocal::new("%Y-%m-%d %H:%M:%S%.3f".into()))
        .with_target(true)
        .with_level(true);

    // Stderr layer — only in debug builds; silenced in release
    #[cfg(debug_assertions)]
    let stderr_layer = Some(
        fmt::layer()
            .with_writer(std::io::stderr)
            .with_ansi(true)
            .with_timer(ChronoLocal::new("%H:%M:%S%.3f".into()))
            .with_target(true),
    );
    #[cfg(not(debug_assertions))]
    let stderr_layer: Option<fmt::Layer<_, _, _, _>> = None;

    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    tracing_subscriber::registry()
        .with(filter)
        .with(file_layer)
        .with(stderr_layer)
        .init();

    tracing::info!(
        log_dir = %log_dir.display(),
        "DiffOrbit logging initialised"
    );

    LogGuard(guard)
}
