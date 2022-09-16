package com.linkedin.datahub.graphql.resolvers.userdefinedreport;

import static com.linkedin.datahub.graphql.TestUtils.getMockAllowContext;
import static com.linkedin.datahub.graphql.TestUtils.getMockDenyContext;
import static org.testng.Assert.assertEquals;
import static org.testng.Assert.assertThrows;

import java.util.Collections;
import java.util.concurrent.CompletionException;

import org.mockito.Mockito;
import org.testng.annotations.Test;

import com.datahub.authentication.Authentication;
import com.google.common.collect.ImmutableSet;
import com.linkedin.common.UrnArray;
import com.linkedin.common.urn.Urn;
import com.linkedin.datahub.graphql.QueryContext;
import com.linkedin.datahub.graphql.generated.ListUserDefinedReportsInput;
import com.linkedin.entity.client.EntityClient;
import com.linkedin.metadata.Constants;
import com.linkedin.metadata.query.ListResult;
import com.linkedin.r2.RemoteInvocationException;

import graphql.schema.DataFetchingEnvironment;

public class ListUserDefinedReportsResolverTest {
    private static final Urn TEST_USER_DEFINED_REPORT_URN = Urn.createFromTuple("userDefinedReport", "test-id");

    private static final ListUserDefinedReportsInput TEST_INPUT = new ListUserDefinedReportsInput(0, 20);

    @Test
    public void testGetSuccess() throws Exception {
        // Create resolver
        EntityClient mockClient = Mockito.mock(EntityClient.class);

        Mockito.when(mockClient.list(Mockito.eq(Constants.USER_DEFINED_REPORT_ENTITY_NAME),
                Mockito.eq(Collections.emptyMap()), Mockito.eq(0), Mockito.eq(20), Mockito.any(Authentication.class)))
                .thenReturn(new ListResult().setStart(0).setCount(1).setTotal(1)
                        .setEntities(new UrnArray(ImmutableSet.of(TEST_USER_DEFINED_REPORT_URN))));

        ListUserDefinedReportsResolver resolver = new ListUserDefinedReportsResolver(mockClient);

        // Execute resolver
        QueryContext mockContext = getMockAllowContext();
        DataFetchingEnvironment mockEnv = Mockito.mock(DataFetchingEnvironment.class);
        Mockito.when(mockEnv.getArgument(Mockito.eq("input"))).thenReturn(TEST_INPUT);
        Mockito.when(mockEnv.getContext()).thenReturn(mockContext);

        // Data Assertions
        assertEquals((int) resolver.get(mockEnv).get().getStart(), 0);
        assertEquals((int) resolver.get(mockEnv).get().getCount(), 1);
        assertEquals((int) resolver.get(mockEnv).get().getTotal(), 1);
        assertEquals(resolver.get(mockEnv).get().getUserDefinedReports().size(), 1);
        assertEquals(resolver.get(mockEnv).get().getUserDefinedReports().get(0).getUrn(),
                TEST_USER_DEFINED_REPORT_URN.toString());
    }

    @Test
    public void testGetUnauthorized() throws Exception {
        // Create resolver
        EntityClient mockClient = Mockito.mock(EntityClient.class);
        ListUserDefinedReportsResolver resolver = new ListUserDefinedReportsResolver(mockClient);

        // Execute resolver
        DataFetchingEnvironment mockEnv = Mockito.mock(DataFetchingEnvironment.class);
        QueryContext mockContext = getMockDenyContext();
        Mockito.when(mockEnv.getArgument(Mockito.eq("input"))).thenReturn(TEST_INPUT);
        Mockito.when(mockEnv.getContext()).thenReturn(mockContext);

        assertThrows(CompletionException.class, () -> resolver.get(mockEnv).join());
        Mockito.verify(mockClient, Mockito.times(0)).list(Mockito.any(), Mockito.anyMap(), Mockito.anyInt(),
                Mockito.anyInt(), Mockito.any(Authentication.class));
    }

    @Test
    public void testGetEntityClientException() throws Exception {
        // Create resolver
        EntityClient mockClient = Mockito.mock(EntityClient.class);
        Mockito.doThrow(RemoteInvocationException.class).when(mockClient).list(Mockito.any(), Mockito.anyMap(),
                Mockito.anyInt(), Mockito.anyInt(), Mockito.any(Authentication.class));
        ListUserDefinedReportsResolver resolver = new ListUserDefinedReportsResolver(mockClient);

        // Execute resolver
        DataFetchingEnvironment mockEnv = Mockito.mock(DataFetchingEnvironment.class);
        QueryContext mockContext = getMockAllowContext();
        Mockito.when(mockEnv.getArgument(Mockito.eq("input"))).thenReturn(TEST_INPUT);
        Mockito.when(mockEnv.getContext()).thenReturn(mockContext);

        assertThrows(CompletionException.class, () -> resolver.get(mockEnv).join());
    }
}
