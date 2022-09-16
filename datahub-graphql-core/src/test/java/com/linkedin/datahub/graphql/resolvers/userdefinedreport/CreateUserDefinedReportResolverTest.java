package com.linkedin.datahub.graphql.resolvers.userdefinedreport;

import static com.linkedin.datahub.graphql.TestUtils.getMockAllowContext;
import static com.linkedin.datahub.graphql.TestUtils.getMockDenyContext;
import static org.testng.Assert.assertThrows;

import java.util.concurrent.CompletionException;

import org.mockito.Mockito;
import org.testng.annotations.Test;

import com.datahub.authentication.Authentication;
import com.linkedin.datahub.graphql.QueryContext;
import com.linkedin.datahub.graphql.generated.CreateUserDefinedReportInput;
import com.linkedin.entity.client.EntityClient;
import com.linkedin.events.metadata.ChangeType;
import com.linkedin.metadata.Constants;
import com.linkedin.metadata.key.UserDefinedReportKey;
import com.linkedin.metadata.utils.GenericRecordUtils;
import com.linkedin.mxe.MetadataChangeProposal;
import com.linkedin.r2.RemoteInvocationException;
import com.linkedin.userdefinedreport.UserDefinedReportProperties;
import com.linkedin.userdefinedreport.UserDefinedReportType;

import graphql.schema.DataFetchingEnvironment;

public class CreateUserDefinedReportResolverTest {

    private static final CreateUserDefinedReportInput TEST_INPUT = new CreateUserDefinedReportInput("test-id",
            "test-name", com.linkedin.datahub.graphql.generated.UserDefinedReportType.valueOf("PIPELINE_TIMELINESS"),
            "test-description");

    @Test
    public void testGetSuccess() throws Exception {
        // Create resolver
        EntityClient mockClient = Mockito.mock(EntityClient.class);
        CreateUserDefinedReportResolver resolver = new CreateUserDefinedReportResolver(mockClient);

        // Execute resolver
        QueryContext mockContext = getMockAllowContext();
        DataFetchingEnvironment mockEnv = Mockito.mock(DataFetchingEnvironment.class);
        Mockito.when(mockEnv.getArgument(Mockito.eq("input"))).thenReturn(TEST_INPUT);
        Mockito.when(mockEnv.getContext()).thenReturn(mockContext);

        resolver.get(mockEnv).get();

        final UserDefinedReportKey key = new UserDefinedReportKey();
        key.setId("test-id");
        final MetadataChangeProposal proposal = new MetadataChangeProposal();
        proposal.setEntityKeyAspect(GenericRecordUtils.serializeAspect(key));
        proposal.setEntityType(Constants.USER_DEFINED_REPORT_ENTITY_NAME);
        UserDefinedReportProperties props = new UserDefinedReportProperties();
        props.setDescription("test-description");
        props.setName("test-name");
        props.setType(UserDefinedReportType.valueOf("PIPELINE_TIMELINESS"));
        proposal.setAspectName(Constants.USER_DEFINED_REPORT_PROPERTIES_ASPECT_NAME);
        proposal.setAspect(GenericRecordUtils.serializeAspect(props));
        proposal.setChangeType(ChangeType.UPSERT);

        // Not ideal to match against "any", but we don't know the auto-generated
        // execution request id
        Mockito.verify(mockClient, Mockito.times(1)).ingestProposal(Mockito.eq(proposal),
                Mockito.any(Authentication.class));
    }

    @Test
    public void testGetUnauthorized() throws Exception {
        // Create resolver
        EntityClient mockClient = Mockito.mock(EntityClient.class);
        CreateUserDefinedReportResolver resolver = new CreateUserDefinedReportResolver(mockClient);

        // Execute resolver
        DataFetchingEnvironment mockEnv = Mockito.mock(DataFetchingEnvironment.class);
        QueryContext mockContext = getMockDenyContext();
        Mockito.when(mockEnv.getArgument(Mockito.eq("input"))).thenReturn(TEST_INPUT);
        Mockito.when(mockEnv.getContext()).thenReturn(mockContext);

        assertThrows(CompletionException.class, () -> resolver.get(mockEnv).join());
        Mockito.verify(mockClient, Mockito.times(0)).ingestProposal(Mockito.any(), Mockito.any(Authentication.class));
    }

    @Test
    public void testGetEntityClientException() throws Exception {
        // Create resolver
        EntityClient mockClient = Mockito.mock(EntityClient.class);
        Mockito.doThrow(RemoteInvocationException.class).when(mockClient).ingestProposal(Mockito.any(),
                Mockito.any(Authentication.class));
        CreateUserDefinedReportResolver resolver = new CreateUserDefinedReportResolver(mockClient);

        // Execute resolver
        DataFetchingEnvironment mockEnv = Mockito.mock(DataFetchingEnvironment.class);
        QueryContext mockContext = getMockAllowContext();
        Mockito.when(mockEnv.getArgument(Mockito.eq("input"))).thenReturn(TEST_INPUT);
        Mockito.when(mockEnv.getContext()).thenReturn(mockContext);

        assertThrows(CompletionException.class, () -> resolver.get(mockEnv).join());
    }
}
