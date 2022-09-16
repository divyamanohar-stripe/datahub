package com.linkedin.datahub.graphql.types.userdefinedreport;

import static com.linkedin.datahub.graphql.TestUtils.getMockAllowContext;
import static org.testng.Assert.assertEquals;
import static org.testng.Assert.assertNull;
import static org.testng.Assert.assertThrows;

import java.util.HashSet;
import java.util.List;

import org.mockito.Mockito;
import org.testng.annotations.Test;

import com.datahub.authentication.Authentication;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.ImmutableSet;
import com.linkedin.common.Owner;
import com.linkedin.common.OwnerArray;
import com.linkedin.common.Ownership;
import com.linkedin.common.OwnershipType;
import com.linkedin.common.urn.Urn;
import com.linkedin.datahub.graphql.QueryContext;
import com.linkedin.datahub.graphql.generated.EntityType;
import com.linkedin.datahub.graphql.generated.UserDefinedReport;
import com.linkedin.entity.Aspect;
import com.linkedin.entity.EntityResponse;
import com.linkedin.entity.EnvelopedAspect;
import com.linkedin.entity.EnvelopedAspectMap;
import com.linkedin.entity.client.EntityClient;
import com.linkedin.metadata.Constants;
import com.linkedin.metadata.key.UserDefinedReportKey;
import com.linkedin.r2.RemoteInvocationException;
import com.linkedin.userdefinedreport.UserDefinedReportProperties;

import graphql.execution.DataFetcherResult;

public class UserDefinedReportTypeTest {
        private static final String TEST_USER_DEFINED_REPORT_1_URN = "urn:li:userDefinedReport:id-1";
        private static final UserDefinedReportKey TEST_USER_DEFINED_REPORT_1_KEY = new UserDefinedReportKey()
                        .setId("id-1");
        private static final UserDefinedReportProperties TEST_USER_DEFINED_REPORT_1_PROPERTIES = new UserDefinedReportProperties()
                        .setDescription("test description").setName("Test User Defined Report")
                        .setType(com.linkedin.userdefinedreport.UserDefinedReportType.valueOf("PIPELINE_TIMELINESS"));
        private static final Ownership TEST_USER_DEFINED_REPORT_1_OWNERSHIP = new Ownership()
                        .setOwners(new OwnerArray(ImmutableList.of(new Owner().setType(OwnershipType.TECHNICAL_OWNER)
                                        .setOwner(Urn.createFromTuple("corpuser", "test")))));

        private static final String TEST_USER_DEFINED_REPORT_2_URN = "urn:li:userDefinedReport:id-2";

        @Test
        public void testBatchLoad() throws Exception {

                EntityClient client = Mockito.mock(EntityClient.class);

                Urn userDefinedReportUrn1 = Urn.createFromString(TEST_USER_DEFINED_REPORT_1_URN);
                Urn userDefinedReportUrn2 = Urn.createFromString(TEST_USER_DEFINED_REPORT_2_URN);

                Mockito.when(client.batchGetV2(Mockito.eq(Constants.USER_DEFINED_REPORT_ENTITY_NAME),
                                Mockito.eq(new HashSet<>(
                                                ImmutableSet.of(userDefinedReportUrn1, userDefinedReportUrn2))),
                                Mockito.eq(UserDefinedReportType.ASPECTS_TO_RESOLVE),
                                Mockito.any(Authentication.class)))
                                .thenReturn(ImmutableMap.of(userDefinedReportUrn1, new EntityResponse()
                                                .setEntityName(Constants.USER_DEFINED_REPORT_ENTITY_NAME)
                                                .setUrn(userDefinedReportUrn1)
                                                .setAspects(new EnvelopedAspectMap(ImmutableMap.of(
                                                                Constants.USER_DEFINED_REPORT_KEY_ASPECT_NAME,
                                                                new EnvelopedAspect().setValue(new Aspect(
                                                                                TEST_USER_DEFINED_REPORT_1_KEY.data())),
                                                                Constants.USER_DEFINED_REPORT_PROPERTIES_ASPECT_NAME,
                                                                new EnvelopedAspect().setValue(new Aspect(
                                                                                TEST_USER_DEFINED_REPORT_1_PROPERTIES
                                                                                                .data())),
                                                                Constants.OWNERSHIP_ASPECT_NAME,
                                                                new EnvelopedAspect().setValue(new Aspect(
                                                                                TEST_USER_DEFINED_REPORT_1_OWNERSHIP
                                                                                                .data())))))));

                UserDefinedReportType type = new UserDefinedReportType(client);

                QueryContext mockContext = getMockAllowContext();
                List<DataFetcherResult<UserDefinedReport>> result = type.batchLoad(
                                ImmutableList.of(TEST_USER_DEFINED_REPORT_1_URN, TEST_USER_DEFINED_REPORT_2_URN),
                                mockContext);

                // Verify response
                Mockito.verify(client, Mockito.times(1)).batchGetV2(
                                Mockito.eq(Constants.USER_DEFINED_REPORT_ENTITY_NAME),
                                Mockito.eq(ImmutableSet.of(userDefinedReportUrn1, userDefinedReportUrn2)),
                                Mockito.eq(UserDefinedReportType.ASPECTS_TO_RESOLVE),
                                Mockito.any(Authentication.class));

                assertEquals(result.size(), 2);

                UserDefinedReport userDefinedReport1 = result.get(0).getData();
                assertEquals(userDefinedReport1.getUrn(), TEST_USER_DEFINED_REPORT_1_URN);
                assertEquals(userDefinedReport1.getId(), "id-1");
                assertEquals(userDefinedReport1.getType(), EntityType.USER_DEFINED_REPORT);
                assertEquals(userDefinedReport1.getOwnership().getOwners().size(), 1);
                assertEquals(userDefinedReport1.getProperties().getDescription(), "test description");
                assertEquals(userDefinedReport1.getProperties().getName(), "Test User Defined Report");
                assertEquals(userDefinedReport1.getProperties().getType().toString(), "PIPELINE_TIMELINESS");

                // Assert second element is null.
                assertNull(result.get(1));
        }

        @Test
        public void testBatchLoadClientException() throws Exception {
                EntityClient mockClient = Mockito.mock(EntityClient.class);
                Mockito.doThrow(RemoteInvocationException.class).when(mockClient).batchGetV2(Mockito.anyString(),
                                Mockito.anySet(), Mockito.anySet(), Mockito.any(Authentication.class));
                UserDefinedReportType type = new UserDefinedReportType(mockClient);

                // Execute Batch load
                QueryContext context = Mockito.mock(QueryContext.class);
                Mockito.when(context.getAuthentication()).thenReturn(Mockito.mock(Authentication.class));
                assertThrows(RuntimeException.class, () -> type.batchLoad(
                                ImmutableList.of(TEST_USER_DEFINED_REPORT_1_URN, TEST_USER_DEFINED_REPORT_2_URN),
                                context));
        }
}