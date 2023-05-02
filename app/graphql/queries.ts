export const helloGql = `
            query {
                hello
            }
        `;


export const loginUserGql = `
            query($loginUserInput: LoginUserInput!){
                loginUser(loginUserInput: $loginUserInput) {
                    accessToken
                    refreshToken
                    message
                    userDetails {
                        _id
                        email
                    }
                }
            }
        `;
