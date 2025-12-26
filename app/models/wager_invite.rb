class WagerInvite < ApplicationRecord
  belongs_to :wager
  belongs_to :inviter, class_name: "User"
  belongs_to :accepted_by, class_name: "User", optional: true

  validates :token, presence: true, uniqueness: true

  scope :active, -> { where(accepted_at: nil, revoked_at: nil) }

  before_validation :ensure_token, on: :create

  def accept!(user)
    raise ArgumentError, "user required" if user.nil?
    raise ArgumentError, "invite already accepted" if accepted_at.present?
    raise ArgumentError, "invite revoked" if revoked_at.present?

    update!(accepted_by: user, accepted_at: Time.current)
  end

  def revoke!
    return if revoked_at.present?
    update!(revoked_at: Time.current)
  end

  private

  def ensure_token
    return if token.present?
    self.token = SecureRandom.urlsafe_base64(24)
  end
end


