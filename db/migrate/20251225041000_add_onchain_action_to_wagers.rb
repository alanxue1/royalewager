class AddOnchainActionToWagers < ActiveRecord::Migration[7.2]
  def change
    add_column :wagers, :onchain_action, :string
    add_column :wagers, :onchain_signature, :string
    add_column :wagers, :onchain_confirmed_at, :datetime
  end
end


