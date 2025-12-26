class User < ApplicationRecord
  CLASH_ROYALE_TAG_RE = /\A#[0289PYLQGRJCUV]{3,}\z/

  validates :privy_user_id, uniqueness: true, allow_nil: true
  validates :primary_wallet_address, uniqueness: true, allow_nil: true
  validates :clash_royale_tag, format: { with: CLASH_ROYALE_TAG_RE, message: "must look like #P0LYQ2" }, allow_blank: true

  before_validation :normalize_clash_royale_tag

  has_many :created_wagers, class_name: "Wager", foreign_key: :creator_id, dependent: :nullify
  has_many :joined_wagers, class_name: "Wager", foreign_key: :joiner_id, dependent: :nullify

  private

  def normalize_clash_royale_tag
    s = clash_royale_tag.to_s.strip.upcase
    s = s.delete(" \t\r\n")
    s = "##{s}" if s.present? && !s.start_with?("#")
    self.clash_royale_tag = s.presence
  end
end
