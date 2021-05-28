import * as uuid from 'uuid'
import { APIGatewayProxyEvent } from "aws-lambda";
import { TodoAccess } from '../dataLayer/todoAccess'
import { getUserId } from './utils';
import { CreateTodoRequest } from '../requests/CreateTodoRequest'
import { TodoItem } from '../models/TodoItem';
import * as AWS  from 'aws-sdk'
import { UpdateTodoRequest } from '../requests/UpdateTodoRequest';

const todoAccess = new TodoAccess()
const s3 = new AWS.S3({
    signatureVersion: 'v4'
})
const bucketName = process.env.IMAGES_S3_BUCKET
const urlExpiration = process.env.SIGNED_URL_EXPIRATION

export async function getAllTodosByUser(event: APIGatewayProxyEvent): Promise<TodoItem[]> {
    const userId = getUserId(event)
    return await todoAccess.getAllTodosByUserId(userId)
}

export async function createTodo(createTodoRequest: CreateTodoRequest, event: APIGatewayProxyEvent): 
Promise<TodoItem> {
    const userId = getUserId(event)
    const todoId = uuid.v4()

    const todoItem : TodoItem = {
        userId: userId,
        todoId: todoId,
        createdAt: new Date().toString(),
        dueDate: createTodoRequest.dueDate,
        name: createTodoRequest.name,
        done: false
    }

    return await todoAccess.createTodo(todoItem)
}

export async function deleteTodo(todoId: string, event: APIGatewayProxyEvent): Promise<boolean> {
    const userId = getUserId(event)
    const validTodoId = await todoAccess.getTodo(todoId, userId)

    if (!validTodoId) {
        throw new Error('Invalid todo Id');
    }

    return await todoAccess.deleteTodo(todoId, userId)
}

export async function generateUploadUrl(todoId: string, event: APIGatewayProxyEvent): Promise<string> {
    const userId = getUserId(event)
    const validTodo: TodoItem = await todoAccess.getTodo(todoId, userId)

    if (!validTodo) {
        throw new Error('Invalid todo Id');
    }

    const imageId = uuid.v4()
    const uploadUrl = getUploadUrl(imageId)
    
    const imageUrl = `https://${bucketName}.s3.amazonaws.com/${imageId}`

    validTodo.attachmentUrl = imageUrl
    await todoAccess.updateTodo(validTodo)

    return uploadUrl
}

export async function updateTodo(todoId: string, event: APIGatewayProxyEvent, updateTodoRequest: UpdateTodoRequest): Promise<boolean> {
    const userId = getUserId(event)
    const validTodo: TodoItem = await todoAccess.getTodo(todoId, userId)

    if (!validTodo) {
        throw new Error('Invalid todo Id');
    }

    validTodo.name = updateTodoRequest.name
    validTodo.dueDate = updateTodoRequest.dueDate
    validTodo.done = updateTodoRequest.done

    if (!validTodo.attachmentUrl) {
        validTodo.attachmentUrl = null
    }

    await todoAccess.updateTodo(validTodo)

    return true
}


function getUploadUrl(imageId: string) {
    return s3.getSignedUrl('putObject', {
      Bucket: bucketName,
      Key: imageId,
      Expires: urlExpiration
    })
  }