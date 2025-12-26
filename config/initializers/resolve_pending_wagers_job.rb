# Start the recurring job when Rails boots (only in non-test environments)
Rails.application.config.after_initialize do
  unless Rails.env.test?
    # Small delay to ensure everything is loaded
    # Use perform_now for first run to ensure it executes immediately
    # Then it will reschedule itself every 10 seconds
    Rails.logger.info("[ResolvePendingWagersJob] Initializer: Starting recurring job")
    ResolvePendingWagersJob.perform_now
  end
end

