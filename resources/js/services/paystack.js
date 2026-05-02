class PaystackService {
    constructor() {
        this.baseUrl = '/api/paystack';
    }

    /**
     * Get list of banks
     */
    async fetchBanks() {
        try {
            const response = await fetch(`${this.baseUrl}/banks`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                }
            });

            const data = await response.json();
            
            if (data.status === 'success') {
                return data.data;
            } else {
                throw new Error(data.message || 'Failed to fetch banks');
            }
        } catch (error) {
            console.error('Error fetching banks:', error);
            throw error;
        }
    }

    /**
     * Resolve bank account
     */
    async resolveAccountNumber(accountNumber, bankCode) {
        try {
            const response = await fetch(`${this.baseUrl}/resolve-account`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    account_number: accountNumber,
                    bank_code: bankCode
                })
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error resolving account:', error);
            throw error;
        }
    }
}

export default new PaystackService();
