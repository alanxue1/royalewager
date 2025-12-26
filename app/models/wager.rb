class Wager < ApplicationRecord
  attr_accessor :duration_minutes
  attr_writer :amount_sol

  LAMPORTS_PER_SOL = 1_000_000_000

  before_validation :apply_amount_sol

  has_many :wager_invites, dependent: :destroy

  enum :status, {
    awaiting_creator_deposit: 0,
    awaiting_joiner_deposit: 1,
    active: 2,
    resolved: 3,
    settled: 4,
    refunded: 5,
    expired: 6,
    failed: 7
  }, prefix: true

  belongs_to :creator, class_name: "User"
  belongs_to :joiner, class_name: "User", optional: true

  validates :tag_a, presence: true
  validates :tag_b, presence: true, if: -> { joiner_id.present? }
  validates :amount_lamports, numericality: { only_integer: true, greater_than: 0 }
  validates :deadline_at, presence: true

  # Virtual attribute used by forms. Persisted value is still `amount_lamports`.
  #
  # - If the user typed a value this request, we return that raw string (so the form
  #   re-renders exactly what they typed on validation errors).
  # - Otherwise we derive from the persisted lamports.
  def amount_sol
    typed = defined?(@amount_sol) ? @amount_sol.to_s : ""
    return typed if typed.present?
    return "" if amount_lamports.nil?

    bd = BigDecimal(amount_lamports) / LAMPORTS_PER_SOL
    s = bd.to_s("F")
    s.sub(/\.0+\z/, "").sub(/(\.\d*[1-9])0+\z/, "\\1")
  end

  def amount_display
    "#{amount_sol} sol"
  end

  def status_display
    status.to_s.humanize.downcase
  end

  private

  def apply_amount_sol
    return unless defined?(@amount_sol)

    raw = @amount_sol.to_s.strip
    bd = BigDecimal(raw, exception: false)
    self.amount_lamports =
      if bd && bd.positive?
        (bd * LAMPORTS_PER_SOL).round(0, BigDecimal::ROUND_HALF_UP).to_i
      else
        nil
      end
  end
end
