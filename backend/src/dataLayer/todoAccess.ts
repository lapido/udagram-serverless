import * as AWS  from 'aws-sdk'
import { TodoItem } from '../models/TodoItem'

import { DocumentClient } from 'aws-sdk/clients/dynamodb'

export class TodoAccess {

    constructor(
        private readonly docClient: DocumentClient = new AWS.DynamoDB.DocumentClient(),
        private readonly todoTable = process.env.TODOS_TABLE) {
    }
    

    async createTodo(todoItem: TodoItem): Promise<TodoItem> {
        await this.docClient.put({
            TableName: this.todoTable,
            Item: todoItem
          }).promise()

        return todoItem
    }

    async deleteTodo(todoId: string, userId: string): Promise<boolean> {
        await this.docClient.delete({
            TableName: this.todoTable,
            Key: {
              'userId': userId,
              'todoId': todoId
            }
          }).promise()

        return true
    }

    async getAllTodosByUserId(userId: string): Promise<TodoItem[]> {
        const indexName = process.env.INDEX_NAME
        const result = await this.docClient.query({
            TableName: this.todoTable,
            IndexName: indexName,
            KeyConditionExpression: 'userId = :userId',
              ExpressionAttributeValues: {
                ':userId': userId
            },
            ScanIndexForward: false
          }).promise()
        
        const items = result.Items
        return items as TodoItem[]
    }

    async getTodo(todoId: string, userId: string): Promise<TodoItem> {
        const result = await this.docClient.get({
            TableName: this.todoTable,
            Key: {
              'userId': userId,
              'todoId': todoId
            }
          }).promise()

        return result.Item as TodoItem
    }

    async updateTodo(todoItem: TodoItem): Promise<boolean> {
        await this.docClient.update({
            TableName: this.todoTable,
            Key: {
              'userId': todoItem.userId,
              'todoId': todoItem.todoId
            },
            ExpressionAttributeNames: {
              '#todo_name': 'name',
            },
            ExpressionAttributeValues: {
              ':name': todoItem.name,
              ':dueDate': todoItem.dueDate,
              ':done': todoItem.done,
              ':todoId': todoItem.todoId,
              ':attachmentUrl': todoItem.attachmentUrl
            },
            ConditionExpression: 'todoId = :todoId',
            UpdateExpression: 'SET #todo_name = :name, dueDate = :dueDate, done = :done, attachmentUrl = :attachmentUrl',
            ReturnValues: 'UPDATED_NEW',
          }).promise()

        return true
    }
}