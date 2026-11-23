import type { SafeClient } from '@orpc/client'
import type { RouterClient } from '@orpc/server'
import type { InjectionKey } from 'vue'
import type { APIRouter } from '../../server/api'

export type RpcClient = SafeClient<RouterClient<APIRouter>>

export const RPC_CLIENT_KEY: InjectionKey<RpcClient> = Symbol('rpcClient')
