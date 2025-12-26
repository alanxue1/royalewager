class Wager < ApplicationRecord
  attr_accessor :duration_minutes

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
end
