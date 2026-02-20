targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

param resourceGroupName string = 'rg-${environmentName}'

var resourceToken = uniqueString(subscription().id, location, environmentName)

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: {
    'azd-env-name': environmentName
  }
}

module resources 'resources.bicep' = {
  name: 'resources'
  scope: rg
  params: {
    environmentName: environmentName
    location: location
    resourceToken: resourceToken
  }
}

output RESOURCE_GROUP_ID string = rg.id
output WEB_APP_URL string = resources.outputs.webAppUrl
