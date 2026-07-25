export type NodeStatus = 'running' | 'paused' | 'error'
export type TreeNodeType = 'pipeline' | 'view' | 'api'

export interface TreeNode {
  id: string
  name: string
  type: TreeNodeType
  children?: TreeNode[]
  status?: NodeStatus
}
