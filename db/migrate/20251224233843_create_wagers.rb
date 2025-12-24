class CreateWagers < ActiveRecord::Migration[7.2]
  def change
    create_table :wagers do |t|
      t.references :creator, null: false, foreign_key: { to_table: :users }
      t.references :joiner, null: true, foreign_key: { to_table: :users }
      t.string :tag_a, null: false
      t.string :tag_b, null: false
      t.bigint :amount_lamports, null: false
      t.datetime :deadline_at, null: false
      t.integer :status, null: false, default: 0
      t.datetime :battle_time
      t.string :battle_fingerprint
      t.string :winner_tag

      t.timestamps
    end

    add_index :wagers, [:tag_a, :tag_b, :created_at]
  end
end
