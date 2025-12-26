module Solana
  module Escrow
    class ProgramId
      PROGRAM_ID_PATH = Rails.root.join("solana", "escrow", "scripts", "PROGRAM_ID.txt")

      def self.call
        from_env = ENV["ESCROW_PROGRAM_ID"].to_s.strip
        return from_env if from_env.present?

        return "" unless PROGRAM_ID_PATH.exist?

        PROGRAM_ID_PATH.read.to_s.strip
      end
    end
  end
end


