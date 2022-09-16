package com.linkedin.datahub.graphql.resolvers.userdefinedreport;

import static com.linkedin.datahub.graphql.TestUtils.getMockAllowContext;
import static com.linkedin.datahub.graphql.TestUtils.getMockDenyContext;
import static org.testng.Assert.assertThrows;

import java.util.Collections;
import java.util.HashSet;
import java.util.concurrent.CompletionException;

import org.mockito.Mockito;
import org.testng.annotations.Test;

import com.datahub.authentication.Authentication;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.ImmutableSet;
import com.linkedin.common.UrnArray;
import com.linkedin.common.urn.Urn;
import com.linkedin.datahub.graphql.QueryContext;
import com.linkedin.entity.Aspect;
import com.linkedin.entity.EntityResponse;
import com.linkedin.entity.EnvelopedAspect;
import com.linkedin.entity.EnvelopedAspectMap;
import com.linkedin.entity.client.EntityClient;
import com.linkedin.events.metadata.ChangeType;
import com.linkedin.metadata.Constants;
import com.linkedin.metadata.entity.EntityService;
import com.linkedin.metadata.utils.GenericRecordUtils;
import com.linkedin.mxe.MetadataChangeProposal;
import com.linkedin.r2.RemoteInvocationException;
import com.linkedin.userdefinedreport.UserDefinedReports;

import graphql.schema.DataFetchingEnvironment;

public class AddUserDefinedReportResolverTest {
    private static final String TEST_ENTITY_URN = "urn:li:dataJob:(test,test)";
    private static final String TEST_EXISTING_USER_DEFINED_REPORT_URN = "urn:li:userDefinedReport:test-id";
    private static final String TEST_NEW_USER_DEFINED_REPORT_URN = "urn:li:userDefinedReport:test-id-2";

    @Test
    public void testGetSuccessNoExistingUserDefinedReports() throws Exception {
        // Create resolver
        EntityClient mockClient = Mockito.mock(EntityClient.class);

        // Test setting the user defined report
        Mockito.when(mockClient.batchGetV2(Mockito.eq(Constants.DATA_JOB_ENTITY_NAME),
                Mockito.eq(new HashSet<>(ImmutableSet.of(Urn.createFromString(TEST_ENTITY_URN)))),
                Mockito.eq(ImmutableSet.of(Constants.USER_DEFINED_REPORTS_ASPECT_NAME)), Mockito.any(Authentication.class)))
                .thenReturn(ImmutableMap.of(Urn.createFromString(TEST_ENTITY_URN),
                        new EntityResponse().setEntityName(Constants.DATA_JOB_ENTITY_NAME)
                                .setUrn(Urn.createFromString(TEST_ENTITY_URN))
                                .setAspects(new EnvelopedAspectMap(Collections.emptyMap()))));

        EntityService mockService = Mockito.mock(EntityService.class);
        Mockito.when(mockService.exists(Urn.createFromString(TEST_ENTITY_URN))).thenReturn(true);
        Mockito.when(mockService.exists(Urn.createFromString(TEST_NEW_USER_DEFINED_REPORT_URN))).thenReturn(true);

        AddUserDefinedReportResolver resolver = new AddUserDefinedReportResolver(mockClient, mockService);

        // Execute resolver
        QueryContext mockContext = getMockAllowContext();
        DataFetchingEnvironment mockEnv = Mockito.mock(DataFetchingEnvironment.class);
        Mockito.when(mockEnv.getArgument(Mockito.eq("entityUrn"))).thenReturn(TEST_ENTITY_URN);
        Mockito.when(mockEnv.getArgument(Mockito.eq("userDefinedReportUrn"))).thenReturn(TEST_NEW_USER_DEFINED_REPORT_URN);
        Mockito.when(mockEnv.getContext()).thenReturn(mockContext);
        resolver.get(mockEnv).get();

        final UserDefinedReports newUserDefinedReports = new UserDefinedReports()
                .setUserDefinedReports(new UrnArray(ImmutableList.of(Urn.createFromString(TEST_NEW_USER_DEFINED_REPORT_URN))));
        final MetadataChangeProposal proposal = new MetadataChangeProposal();
        proposal.setEntityUrn(Urn.createFromString(TEST_ENTITY_URN));
        proposal.setEntityType(Constants.DATA_JOB_ENTITY_NAME);
        proposal.setAspectName(Constants.USER_DEFINED_REPORTS_ASPECT_NAME);
        proposal.setAspect(GenericRecordUtils.serializeAspect(newUserDefinedReports));
        proposal.setChangeType(ChangeType.UPSERT);

        Mockito.verify(mockClient, Mockito.times(1)).ingestProposal(Mockito.eq(proposal),
                Mockito.any(Authentication.class));

        Mockito.verify(mockService, Mockito.times(1)).exists(Mockito.eq(Urn.createFromString(TEST_ENTITY_URN)));

        Mockito.verify(mockService, Mockito.times(1)).exists(Mockito.eq(Urn.createFromString(TEST_NEW_USER_DEFINED_REPORT_URN)));
    }

    @Test
    public void testGetSuccessExistingUserDefinedReports() throws Exception {
        UserDefinedReports originalUserDefinedReports = new UserDefinedReports()
                .setUserDefinedReports(new UrnArray(ImmutableList.of(Urn.createFromString(TEST_EXISTING_USER_DEFINED_REPORT_URN))));

        // Create resolver
        EntityClient mockClient = Mockito.mock(EntityClient.class);

        // Test setting the user defined report
        Mockito.when(mockClient.batchGetV2(Mockito.eq(Constants.DATA_JOB_ENTITY_NAME),
                Mockito.eq(new HashSet<>(ImmutableSet.of(Urn.createFromString(TEST_ENTITY_URN)))),
                Mockito.eq(ImmutableSet.of(Constants.USER_DEFINED_REPORTS_ASPECT_NAME)), Mockito.any(Authentication.class)))
                .thenReturn(ImmutableMap.of(Urn.createFromString(TEST_ENTITY_URN),
                        new EntityResponse().setEntityName(Constants.DATA_JOB_ENTITY_NAME)
                                .setUrn(Urn.createFromString(TEST_ENTITY_URN))
                                .setAspects(new EnvelopedAspectMap(ImmutableMap.of(Constants.USER_DEFINED_REPORTS_ASPECT_NAME,
                                        new EnvelopedAspect().setValue(new Aspect(originalUserDefinedReports.data())))))));

        EntityService mockService = Mockito.mock(EntityService.class);
        Mockito.when(mockService.exists(Urn.createFromString(TEST_ENTITY_URN))).thenReturn(true);
        Mockito.when(mockService.exists(Urn.createFromString(TEST_NEW_USER_DEFINED_REPORT_URN))).thenReturn(true);
        Mockito.when(mockService.getAspect(Urn.createFromString(TEST_ENTITY_URN),
                        Constants.USER_DEFINED_REPORTS_ASPECT_NAME, 0L)).thenReturn(originalUserDefinedReports);

        AddUserDefinedReportResolver resolver = new AddUserDefinedReportResolver(mockClient, mockService);

        // Execute resolver
        QueryContext mockContext = getMockAllowContext();
        DataFetchingEnvironment mockEnv = Mockito.mock(DataFetchingEnvironment.class);
        Mockito.when(mockEnv.getArgument(Mockito.eq("entityUrn"))).thenReturn(TEST_ENTITY_URN);
        Mockito.when(mockEnv.getArgument(Mockito.eq("userDefinedReportUrn"))).thenReturn(TEST_NEW_USER_DEFINED_REPORT_URN);
        Mockito.when(mockEnv.getContext()).thenReturn(mockContext);
        resolver.get(mockEnv).get();

        final UserDefinedReports newUserDefinedReports = new UserDefinedReports()
                        .setUserDefinedReports(new UrnArray(ImmutableList.of(Urn.createFromString(TEST_EXISTING_USER_DEFINED_REPORT_URN),
                                        Urn.createFromString(TEST_NEW_USER_DEFINED_REPORT_URN))));
        final MetadataChangeProposal proposal = new MetadataChangeProposal();
        proposal.setEntityUrn(Urn.createFromString(TEST_ENTITY_URN));
        proposal.setEntityType(Constants.DATA_JOB_ENTITY_NAME);
        proposal.setAspectName(Constants.USER_DEFINED_REPORTS_ASPECT_NAME);
        proposal.setAspect(GenericRecordUtils.serializeAspect(newUserDefinedReports));
        proposal.setChangeType(ChangeType.UPSERT);

        Mockito.verify(mockClient, Mockito.times(1)).ingestProposal(Mockito.eq(proposal),
                Mockito.any(Authentication.class));

        Mockito.verify(mockService, Mockito.times(1)).exists(Mockito.eq(Urn.createFromString(TEST_ENTITY_URN)));

        Mockito.verify(mockService, Mockito.times(1)).exists(Mockito.eq(Urn.createFromString(TEST_NEW_USER_DEFINED_REPORT_URN)));
    }

    @Test
    public void testGetFailureUserDefinedReportDoesNotExist() throws Exception {
        // Create resolver
        EntityClient mockClient = Mockito.mock(EntityClient.class);

        // Test setting the user defined report
        Mockito.when(mockClient.batchGetV2(Mockito.eq(Constants.DATA_JOB_ENTITY_NAME),
                Mockito.eq(new HashSet<>(ImmutableSet.of(Urn.createFromString(TEST_ENTITY_URN)))),
                Mockito.eq(ImmutableSet.of(Constants.USER_DEFINED_REPORTS_ASPECT_NAME)), Mockito.any(Authentication.class)))
                .thenReturn(ImmutableMap.of(Urn.createFromString(TEST_ENTITY_URN),
                        new EntityResponse().setEntityName(Constants.DATA_JOB_ENTITY_NAME)
                                .setUrn(Urn.createFromString(TEST_ENTITY_URN))
                                .setAspects(new EnvelopedAspectMap(Collections.emptyMap()))));

        EntityService mockService = Mockito.mock(EntityService.class);
        Mockito.when(mockService.exists(Urn.createFromString(TEST_ENTITY_URN))).thenReturn(true);
        Mockito.when(mockService.exists(Urn.createFromString(TEST_NEW_USER_DEFINED_REPORT_URN))).thenReturn(false);

        AddUserDefinedReportResolver resolver = new AddUserDefinedReportResolver(mockClient, mockService);

        // Execute resolver
        QueryContext mockContext = getMockAllowContext();
        DataFetchingEnvironment mockEnv = Mockito.mock(DataFetchingEnvironment.class);
        Mockito.when(mockEnv.getArgument(Mockito.eq("entityUrn"))).thenReturn(TEST_ENTITY_URN);
        Mockito.when(mockEnv.getArgument(Mockito.eq("userDefinedReportUrn"))).thenReturn(TEST_NEW_USER_DEFINED_REPORT_URN);
        Mockito.when(mockEnv.getContext()).thenReturn(mockContext);

        assertThrows(CompletionException.class, () -> resolver.get(mockEnv).join());
        Mockito.verify(mockClient, Mockito.times(0)).ingestProposal(Mockito.any(), Mockito.any(Authentication.class));
    }

    @Test
    public void testGetFailureEntityDoesNotExist() throws Exception {
        // Create resolver
        EntityClient mockClient = Mockito.mock(EntityClient.class);

        // Test setting the user defined report
        Mockito.when(mockClient.batchGetV2(Mockito.eq(Constants.DATA_JOB_ENTITY_NAME),
                Mockito.eq(new HashSet<>(ImmutableSet.of(Urn.createFromString(TEST_ENTITY_URN)))),
                Mockito.eq(ImmutableSet.of(Constants.USER_DEFINED_REPORTS_ASPECT_NAME)), Mockito.any(Authentication.class)))
                .thenReturn(ImmutableMap.of(Urn.createFromString(TEST_ENTITY_URN),
                        new EntityResponse().setEntityName(Constants.DATA_JOB_ENTITY_NAME)
                                .setUrn(Urn.createFromString(TEST_ENTITY_URN))
                                .setAspects(new EnvelopedAspectMap(Collections.emptyMap()))));

        EntityService mockService = Mockito.mock(EntityService.class);
        Mockito.when(mockService.exists(Urn.createFromString(TEST_ENTITY_URN))).thenReturn(false);
        Mockito.when(mockService.exists(Urn.createFromString(TEST_NEW_USER_DEFINED_REPORT_URN))).thenReturn(true);

        AddUserDefinedReportResolver resolver = new AddUserDefinedReportResolver(mockClient, mockService);

        // Execute resolver
        QueryContext mockContext = getMockAllowContext();
        DataFetchingEnvironment mockEnv = Mockito.mock(DataFetchingEnvironment.class);
        Mockito.when(mockEnv.getArgument(Mockito.eq("entityUrn"))).thenReturn(TEST_ENTITY_URN);
        Mockito.when(mockEnv.getArgument(Mockito.eq("userDefinedReportUrn"))).thenReturn(TEST_NEW_USER_DEFINED_REPORT_URN);
        Mockito.when(mockEnv.getContext()).thenReturn(mockContext);

        assertThrows(CompletionException.class, () -> resolver.get(mockEnv).join());
        Mockito.verify(mockClient, Mockito.times(0)).ingestProposal(Mockito.any(), Mockito.any(Authentication.class));
    }

    @Test
    public void testGetUnauthorized() throws Exception {
        // Create resolver
        EntityClient mockClient = Mockito.mock(EntityClient.class);
        EntityService mockService = Mockito.mock(EntityService.class);
        AddUserDefinedReportResolver resolver = new AddUserDefinedReportResolver(mockClient, mockService);

        // Execute resolver
        DataFetchingEnvironment mockEnv = Mockito.mock(DataFetchingEnvironment.class);
        Mockito.when(mockEnv.getArgument(Mockito.eq("entityUrn"))).thenReturn(TEST_ENTITY_URN);
        Mockito.when(mockEnv.getArgument(Mockito.eq("userDefinedReportUrn"))).thenReturn(TEST_NEW_USER_DEFINED_REPORT_URN);
        QueryContext mockContext = getMockDenyContext();
        Mockito.when(mockEnv.getContext()).thenReturn(mockContext);

        assertThrows(CompletionException.class, () -> resolver.get(mockEnv).join());
        Mockito.verify(mockClient, Mockito.times(0)).ingestProposal(Mockito.any(), Mockito.any(Authentication.class));
    }

    @Test
    public void testGetEntityClientException() throws Exception {
        EntityClient mockClient = Mockito.mock(EntityClient.class);
        Mockito.doThrow(RemoteInvocationException.class).when(mockClient).ingestProposal(Mockito.any(),
                Mockito.any(Authentication.class));
        AddUserDefinedReportResolver resolver = new AddUserDefinedReportResolver(mockClient, Mockito.mock(EntityService.class));

        // Execute resolver
        DataFetchingEnvironment mockEnv = Mockito.mock(DataFetchingEnvironment.class);
        QueryContext mockContext = getMockAllowContext();
        Mockito.when(mockEnv.getArgument(Mockito.eq("entityUrn"))).thenReturn(TEST_ENTITY_URN);
        Mockito.when(mockEnv.getArgument(Mockito.eq("userDefinedReportUrn"))).thenReturn(TEST_NEW_USER_DEFINED_REPORT_URN);
        Mockito.when(mockEnv.getContext()).thenReturn(mockContext);

        assertThrows(CompletionException.class, () -> resolver.get(mockEnv).join());
    }
}
