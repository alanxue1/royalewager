class CreateWagerInvites < ActiveRecord::Migration[7.2]
  def change
    create_table :wager_invites do |t|
      t.references :wager, null: false, foreign_key: true
      t.references :inviter, null: false, foreign_key: { to_table: :users }
      t.string :token, null: false
      t.references :accepted_by, null: true, foreign_key: { to_table: :users }
      t.datetime :accepted_at
      t.datetime :revoked_at
      t.timestamps
    end

    add_index :wager_invites, :token, unique: true
    add_index :wager_invites, [:wager_id, :revoked_at]
  end
end


