class User < ApplicationRecord
  validates :privy_user_id, uniqueness: true, allow_nil: true
  validates :primary_wallet_address, uniqueness: true, allow_nil: true

  has_many :created_wagers, class_name: "Wager", foreign_key: :creator_id, dependent: :nullify
  has_many :joined_wagers, class_name: "Wager", foreign_key: :joiner_id, dependent: :nullify
end
