class CreateUsers < ActiveRecord::Migration[7.2]
  def change
    create_table :users do |t|
      t.string :privy_user_id
      t.string :email
      t.string :primary_wallet_address

      t.timestamps
    end
    add_index :users, :privy_user_id, unique: true
    add_index :users, :primary_wallet_address, unique: true
  end
end
