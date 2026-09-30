export interface TokenPayload {
  uid: number
  roleCode: string
}

export interface PublicUser {
  id: number
  username: string
  nickname: string
  roleCode: string
  roleName: string
}
