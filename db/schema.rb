# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.2].define(version: 2025_12_26_040000) do
  create_table "users", force: :cascade do |t|
    t.string "privy_user_id"
    t.string "email"
    t.string "primary_wallet_address"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "clash_royale_tag"
    t.index ["clash_royale_tag"], name: "index_users_on_clash_royale_tag", unique: true
    t.index ["primary_wallet_address"], name: "index_users_on_primary_wallet_address", unique: true
    t.index ["privy_user_id"], name: "index_users_on_privy_user_id", unique: true
  end

  create_table "wager_invites", force: :cascade do |t|
    t.integer "wager_id", null: false
    t.integer "inviter_id", null: false
    t.string "token", null: false
    t.integer "accepted_by_id"
    t.datetime "accepted_at"
    t.datetime "revoked_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["accepted_by_id"], name: "index_wager_invites_on_accepted_by_id"
    t.index ["inviter_id"], name: "index_wager_invites_on_inviter_id"
    t.index ["token"], name: "index_wager_invites_on_token", unique: true
    t.index ["wager_id", "revoked_at"], name: "index_wager_invites_on_wager_id_and_revoked_at"
    t.index ["wager_id"], name: "index_wager_invites_on_wager_id"
  end

  create_table "wagers", force: :cascade do |t|
    t.integer "creator_id", null: false
    t.integer "joiner_id"
    t.string "tag_a", null: false
    t.string "tag_b"
    t.bigint "amount_lamports", null: false
    t.datetime "deadline_at", null: false
    t.integer "status", default: 0, null: false
    t.datetime "battle_time"
    t.string "battle_fingerprint"
    t.string "winner_tag"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "creator_deposit_signature"
    t.string "joiner_deposit_signature"
    t.datetime "creator_deposit_confirmed_at"
    t.datetime "joiner_deposit_confirmed_at"
    t.string "onchain_action"
    t.string "onchain_signature"
    t.datetime "onchain_confirmed_at"
    t.json "battle_data"
    t.index ["creator_id"], name: "index_wagers_on_creator_id"
    t.index ["joiner_id"], name: "index_wagers_on_joiner_id"
    t.index ["tag_a", "tag_b", "created_at"], name: "index_wagers_on_tag_a_and_tag_b_and_created_at"
  end

  add_foreign_key "wager_invites", "users", column: "accepted_by_id"
  add_foreign_key "wager_invites", "users", column: "inviter_id"
  add_foreign_key "wager_invites", "wagers"
  add_foreign_key "wagers", "users", column: "creator_id"
  add_foreign_key "wagers", "users", column: "joiner_id"
end
