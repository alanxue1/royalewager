class AddDepositSignaturesToWagers < ActiveRecord::Migration[7.2]
  def change
    add_column :wagers, :creator_deposit_signature, :string
    add_column :wagers, :joiner_deposit_signature, :string
    add_column :wagers, :creator_deposit_confirmed_at, :datetime
    add_column :wagers, :joiner_deposit_confirmed_at, :datetime
  end
end


